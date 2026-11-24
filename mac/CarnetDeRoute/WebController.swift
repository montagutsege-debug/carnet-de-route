import AppKit
import WebKit

/// La vue web qui affiche le carnet, et tout ce qu'un navigateur ferait
/// à sa place : choisir des photos, enregistrer un fichier, imprimer,
/// ouvrir les liens dans Safari, appeler le serveur des suggestions.
final class WebController: NSObject {
    let webView: WKWebView

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default() // persistent storage for the carnet
        configuration.setURLSchemeHandler(LocalSchemeHandler(), forURLScheme: LocalSchemeHandler.scheme)

        let content = WKUserContentController()
        content.addUserScript(WKUserScript(source: WebController.bridgeScript,
                                           injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true))
        configuration.userContentController = content

        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()

        content.add(self, name: "carnetPrint")
        content.addScriptMessageHandler(self, contentWorld: .page, name: "carnetApi")

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = true
        if #available(macOS 13.3, *) {
            webView.isInspectable = true // Safari > Développement, pour diagnostiquer
        }
    }

    func load() {
        webView.load(URLRequest(url: LocalSchemeHandler.startURL))
    }

    /// Asks the web app to write any pending change, then calls `completion`
    /// (after 3 seconds at most, so the app can always quit).
    func flushPendingSaves(completion: @escaping () -> Void) {
        var done = false
        let finish = {
            guard !done else { return }
            done = true
            completion()
        }
        webView.callAsyncJavaScript(
            "if (window.__carnetFlush) { await window.__carnetFlush(); } return true;",
            arguments: [:],
            in: nil,
            in: .page
        ) { _ in
            DispatchQueue.main.async(execute: finish)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: finish)
    }

    /// Injected before the page loads: routes window.print() and the
    /// suggestions requests (/api/…) to the native side.
    private static let bridgeScript = """
    (function () {
      window.print = function () {
        window.webkit.messageHandlers.carnetPrint.postMessage(null);
      };
      var nativeFetch = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('/api/') === 0) {
          var reply = await window.webkit.messageHandlers.carnetApi.postMessage({
            path: url,
            method: (init && init.method) || 'GET',
            body: (init && typeof init.body === 'string') ? init.body : null
          });
          return new Response(reply.body, {
            status: reply.status,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return nativeFetch(input, init);
      };
    })();
    """

    private func printPage() {
        guard let window = webView.window else { return }
        let info = (NSPrintInfo.shared.copy() as? NSPrintInfo) ?? NSPrintInfo()
        info.paperSize = NSSize(width: 595.28, height: 841.89) // A4
        info.topMargin = 28
        info.bottomMargin = 28
        info.leftMargin = 28
        info.rightMargin = 28
        info.horizontalPagination = .fit
        info.verticalPagination = .automatic
        info.isHorizontallyCentered = false
        info.isVerticallyCentered = false

        let operation = webView.printOperation(with: info)
        operation.showsPrintPanel = true
        operation.showsProgressPanel = true
        // Without a frame, WebKit can print blank pages.
        operation.view?.frame = webView.bounds
        operation.runModal(for: window, delegate: nil, didRun: nil, contextInfo: nil)
    }

    private static func jsonError(_ message: String) -> String {
        let data = (try? JSONSerialization.data(withJSONObject: ["error": message])) ?? Data()
        return String(data: data, encoding: .utf8) ?? "{}"
    }
}

// MARK: - Messages from the page

extension WebController: WKScriptMessageHandler, WKScriptMessageHandlerWithReply {
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        if message.name == "carnetPrint" {
            printPage()
        }
    }

    /// Suggestions « aux alentours » : relayées vers l'appli en ligne (Vercel).
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.name == "carnetApi",
              let body = message.body as? [String: Any],
              let path = body["path"] as? String
        else {
            replyHandler(["status": 400, "body": Self.jsonError("Requête invalide.")], nil)
            return
        }

        let server = AppConfig.suggestionsServer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !server.isEmpty, let url = URL(string: server.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path) else {
            replyHandler([
                "status": 503,
                "body": Self.jsonError("Les suggestions ne sont pas encore activées dans l’application Mac : indiquez l’adresse de votre appli en ligne dans AppConfig.swift."),
            ], nil)
            return
        }

        var request = URLRequest(url: url, timeoutInterval: 90)
        request.httpMethod = (body["method"] as? String) ?? "GET"
        if let text = body["body"] as? String {
            request.httpBody = Data(text.utf8)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 502
            let text: String
            if let error {
                text = Self.jsonError("Pas de connexion au serveur des suggestions (\(error.localizedDescription)).")
            } else {
                text = data.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
            }
            DispatchQueue.main.async {
                replyHandler(["status": error == nil ? status : 502, "body": text], nil)
            }
        }.resume()
    }
}

// MARK: - Navigation, links and downloads

extension WebController: WKNavigationDelegate, WKDownloadDelegate {
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download) // « Sauvegarder (.json) »
            return
        }
        if let url = navigationAction.request.url,
           let scheme = url.scheme?.lowercased(),
           !["carnet", "blob", "data", "about"].contains(scheme) {
            NSWorkspace.shared.open(url) // external links open in the browser
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload,
                  decideDestinationUsing response: URLResponse,
                  suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.canCreateDirectories = true
        guard let window = webView.window else {
            completionHandler(nil)
            return
        }
        panel.beginSheetModal(for: window) { result in
            guard result == .OK, let url = panel.url else {
                completionHandler(nil)
                return
            }
            // The panel already asked to replace an existing file; WebKit refuses to overwrite.
            try? FileManager.default.removeItem(at: url)
            completionHandler(url)
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        let alert = NSAlert()
        alert.messageText = "La sauvegarde n’a pas pu être enregistrée."
        alert.informativeText = error.localizedDescription
        alert.runModal()
    }
}

// MARK: - Photo picker, dialogs, new windows

extension WebController: WKUIDelegate {
    /// « Ajouter des photos » et « Restaurer » : fenêtre de choix de fichiers.
    func webView(_ webView: WKWebView,
                 runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        guard let window = webView.window else {
            completionHandler(nil)
            return
        }
        panel.beginSheetModal(for: window) { result in
            completionHandler(result == .OK ? panel.urls : nil)
        }
    }

    /// Links with target="_blank": open them in the default browser.
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Annuler")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }
}
