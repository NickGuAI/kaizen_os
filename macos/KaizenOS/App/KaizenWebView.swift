import AppKit
import SwiftUI
import WebKit

struct KaizenWebView: NSViewRepresentable {
    let rootURL: URL
    @ObservedObject var oauthBridge: OAuthBridge

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView

        let request = URLRequest(
            url: rootURL,
            cachePolicy: .reloadRevalidatingCacheData,
            timeoutInterval: 60
        )
        webView.load(request)

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        guard let deepLink = oauthBridge.lastDeepLink else { return }
        guard context.coordinator.lastHandledDeepLink != deepLink else { return }

        context.coordinator.lastHandledDeepLink = deepLink
        context.coordinator.notifyOAuthCompletion(with: deepLink)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let parent: KaizenWebView
        weak var webView: WKWebView?
        var lastHandledDeepLink: URL?

        init(_ parent: KaizenWebView) {
            self.parent = parent
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url,
                  let host = url.host?.lowercased() else {
                decisionHandler(.allow)
                return
            }

            if AppConfiguration.oauthHosts.contains(host) {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            let isFirstParty = AppConfiguration.allowedFirstPartyHosts.contains(host)
            if !isFirstParty && navigationAction.navigationType == .linkActivated {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func notifyOAuthCompletion(with callbackURL: URL) {
            guard let webView else { return }

            let payload = callbackURL.absoluteString
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")

            let script = """
            window.dispatchEvent(new CustomEvent('kaizen:native-oauth', { detail: { callbackUrl: '\(payload)' } }));
            window.location.reload();
            """

            webView.evaluateJavaScript(script) { _, error in
                if let error {
                    print("[KaizenWebView] Failed to notify OAuth completion: \(error.localizedDescription)")
                }
            }
        }
    }
}
