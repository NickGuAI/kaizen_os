import SwiftUI

final class OAuthBridge: ObservableObject {
    @Published var lastDeepLink: URL?

    func handleDeepLink(_ url: URL) {
        guard url.scheme?.lowercased() == "kaizenos" else { return }
        lastDeepLink = url
    }
}

@main
struct KaizenOSApp: App {
    @StateObject private var oauthBridge = OAuthBridge()

    var body: some Scene {
        WindowGroup {
            KaizenWebView(rootURL: AppConfiguration.rootURL, oauthBridge: oauthBridge)
                .onOpenURL { url in
                    oauthBridge.handleDeepLink(url)
                }
                .frame(minWidth: 1024, minHeight: 720)
        }
        .windowResizability(.contentSize)
    }
}
