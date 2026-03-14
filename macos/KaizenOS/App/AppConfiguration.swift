import Foundation

enum AppConfiguration {
    static var rootURL: URL {
        if let configured = Bundle.main.object(forInfoDictionaryKey: "KAIZEN_WEB_URL") as? String,
           let url = URL(string: configured) {
            return url
        }

        return URL(string: "https://kaizen.gehirn.ai")!
    }

    static var allowedFirstPartyHosts: Set<String> {
        [rootURL.host ?? "", "localhost", "127.0.0.1"]
    }

    static let oauthHosts: Set<String> = [
        "accounts.google.com",
        "oauth2.googleapis.com",
        "apis.google.com",
    ]
}
