import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { WorkItemAdapter, ListForRangeParams } from '../WorkItemAdapter';
import {
  WorkItem,
  WorkItemSource,
  WorkItemKind,
  WorkItemStatus,
  buildWorkItemKey,
} from '../WorkItemTypes';
import { prisma } from '../../../lib/db';
import { decryptToken } from '../../../lib/crypto';

/**
 * Notion adapter for WorkItems.
 * Fetches tasks from Notion databases and maps them to WorkItems.
 * Expects databases to have standard properties: Name (title), Status (select), Due (date)
 */
export class NotionAdapter implements WorkItemAdapter {
  readonly source: WorkItemSource = 'notion';
  readonly kinds: WorkItemKind[] = ['task'];

  async listForRange(params: ListForRangeParams): Promise<WorkItem[]> {
    const { userId, startIso, endIso, accountId } = params;

    // Get user's Notion accounts
    const accounts = await prisma.notionAccount.findMany({
      where: {
        userId,
        ...(accountId ? { id: accountId } : {}),
      },
    });

    if (accounts.length === 0) {
      return [];
    }

    const allWorkItems: WorkItem[] = [];

    for (const account of accounts) {
      try {
        const notion = new Client({
          auth: decryptToken(account.accessTokenEncrypted),
        });

        const databaseIds = (account.selectedDatabaseIds as string[]) || [];
        if (databaseIds.length === 0) {
          continue;
        }

        for (const databaseId of databaseIds) {
          try {
            const workItems = await this.fetchFromDatabase(
              notion,
              account.id,
              databaseId,
              startIso,
              endIso
            );
            allWorkItems.push(...workItems);
          } catch (dbError) {
            console.error(`Failed to fetch from Notion database ${databaseId}:`, dbError);
            // Continue with other databases
          }
        }
      } catch (accountError) {
        console.error(`Failed to get tasks for Notion account ${account.id}:`, accountError);
        // Continue with other accounts
      }
    }

    return allWorkItems;
  }

  /**
   * Fetch tasks from a single Notion database.
   * Filters by Due date being in the specified range.
   */
  private async fetchFromDatabase(
    notion: Client,
    accountId: string,
    databaseId: string,
    startIso: string,
    endIso: string
  ): Promise<WorkItem[]> {
    // Query database with date filter
    // Note: Notion filter uses date comparison on the Due property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (notion as any).databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Due',
            date: {
              on_or_after: startIso.split('T')[0], // Notion expects date format YYYY-MM-DD
            },
          },
          {
            property: 'Due',
            date: {
              on_or_before: endIso.split('T')[0],
            },
          },
        ],
      },
      page_size: 100,
    });

    const workItems: WorkItem[] = [];

    for (const page of response.results) {
      if (!this.isPageObject(page)) continue;

      const workItem = this.mapPageToWorkItem(page, accountId, databaseId);
      if (workItem) {
        workItems.push(workItem);
      }
    }

    return workItems;
  }

  /**
   * Type guard for PageObjectResponse
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isPageObject(page: any): page is PageObjectResponse {
    return 'properties' in page;
  }

  /**
   * Map Notion page to WorkItem.
   * Key format: notion:{accountId}:{databaseId}:{pageId}
   *
   * Expected properties:
   * - Name or Title (title property) -> title
   * - Status (select property) -> status
   * - Due (date property) -> dueAt
   */
  private mapPageToWorkItem(
    page: PageObjectResponse,
    accountId: string,
    databaseId: string
  ): WorkItem | null {
    const key = buildWorkItemKey('notion', accountId, databaseId, page.id);

    // Extract title from Name or Title property
    const title = this.extractTitle(page.properties);
    if (!title) {
      return null; // Skip pages without a title
    }

    // Extract status
    const status = this.extractStatus(page.properties);

    // Extract due date
    const dueAt = this.extractDueDate(page.properties);

    return {
      kind: 'task',
      source: 'notion',
      key,
      title,
      url: page.url,
      dueAt,
      status,
      raw: page,
    };
  }

  /**
   * Extract title from page properties.
   * Looks for common title property names: Name, Title, Task
   */
  private extractTitle(properties: PageObjectResponse['properties']): string | null {
    const titlePropertyNames = ['Name', 'Title', 'Task', 'name', 'title', 'task'];

    for (const propName of titlePropertyNames) {
      const prop = properties[propName];
      if (prop && prop.type === 'title' && prop.title.length > 0) {
        return prop.title.map((t) => t.plain_text).join('');
      }
    }

    // Try to find any title property
    for (const [, prop] of Object.entries(properties)) {
      if (prop.type === 'title' && prop.title.length > 0) {
        return prop.title.map((t) => t.plain_text).join('');
      }
    }

    return null;
  }

  /**
   * Extract status from page properties.
   * Maps Notion status to WorkItemStatus.
   */
  private extractStatus(properties: PageObjectResponse['properties']): WorkItemStatus {
    const statusPropertyNames = ['Status', 'status'];

    for (const propName of statusPropertyNames) {
      const prop = properties[propName];

      if (prop && prop.type === 'status' && prop.status) {
        const statusName = prop.status.name.toLowerCase();
        if (statusName.includes('done') || statusName.includes('complete')) {
          return 'done';
        }
        if (statusName.includes('cancel')) {
          return 'cancelled';
        }
        return 'open';
      }

      if (prop && prop.type === 'select' && prop.select) {
        const statusName = prop.select.name.toLowerCase();
        if (statusName.includes('done') || statusName.includes('complete')) {
          return 'done';
        }
        if (statusName.includes('cancel')) {
          return 'cancelled';
        }
        return 'open';
      }

      if (prop && prop.type === 'checkbox') {
        return prop.checkbox ? 'done' : 'open';
      }
    }

    return 'open';
  }

  /**
   * Extract due date from page properties.
   */
  private extractDueDate(properties: PageObjectResponse['properties']): string | undefined {
    const datePropertyNames = ['Due', 'Due Date', 'Date', 'due', 'due date', 'date'];

    for (const propName of datePropertyNames) {
      const prop = properties[propName];
      if (prop && prop.type === 'date' && prop.date) {
        // Return start date/time
        return prop.date.start || undefined;
      }
    }

    return undefined;
  }
}
