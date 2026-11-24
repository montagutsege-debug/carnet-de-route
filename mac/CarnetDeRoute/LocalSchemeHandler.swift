import Foundation
import WebKit

/// Sert les fichiers de l'appli web embarquée (dossier « Web » de l'application)
/// à l'adresse carnet://localhost/… : le carnet garde ainsi une adresse fixe,
/// et ses données (IndexedDB) restent enregistrées d'un lancement à l'autre.
final class LocalSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "carnet"
    static let startURL = URL(string: "carnet://localhost/")!

    private let root: URL = {
        let base = Bundle.main.resourceURL ?? Bundle.main.bundleURL
        return base.appendingPathComponent("Web", isDirectory: true).standardizedFileURL
    }()

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        var path = url.path
        if path.isEmpty || path == "/" {
            path = "/index.html"
        }

        let fileURL = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        // Never serve anything outside the Web folder.
        guard fileURL.path.hasPrefix(root.path + "/"),
              let data = try? Data(contentsOf: fileURL)
        else {
            respond(urlSchemeTask, url: url, status: 404, mimeType: "text/plain",
                    data: Data("Fichier introuvable".utf8))
            return
        }

        respond(urlSchemeTask, url: url, status: 200,
                mimeType: Self.mimeType(for: fileURL.pathExtension), data: data)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Files are answered synchronously: nothing to cancel.
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, mimeType: String, data: Data) {
        let headers = [
            "Content-Type": mimeType,
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: status,
                                       httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        case "webmanifest": return "application/manifest+json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
