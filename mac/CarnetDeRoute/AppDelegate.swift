import AppKit

/// Point d'entrée de l'application Mac « Carnet de Route ».
/// Une seule fenêtre qui affiche l'appli web embarquée (dossier Web).
@main
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private static var instance: AppDelegate?

    private var window: NSWindow!
    private var web: WebController!
    private var closeConfirmed = false

    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        instance = delegate // NSApplication.delegate is weak
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        app.run()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.mainMenu = MainMenu.build()

        web = WebController()

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Carnet de Route"
        window.minSize = NSSize(width: 900, height: 600)
        window.contentView = web.webView
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("CarnetDeRouteMainWindow")
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        web.load()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    // Cmd+Q : on enregistre d'abord les dernières modifications du carnet.
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if closeConfirmed || web == nil { return .terminateNow }
        web.flushPendingSaves { [weak self] in
            self?.closeConfirmed = true
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
    }

    // Fermeture de la fenêtre : même précaution.
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if closeConfirmed { return true }
        web.flushPendingSaves { [weak self] in
            self?.closeConfirmed = true
            sender.close()
        }
        return false
    }

    // MARK: - Menu « Carnet de Route »

    @objc func editGeminiKey(_ sender: Any?) {
        web.askForGeminiKey()
    }

    // MARK: - Menu Présentation (zoom)

    @objc func zoomInPage(_ sender: Any?) {
        web.webView.pageZoom = min(web.webView.pageZoom + 0.1, 2.0)
    }

    @objc func zoomOutPage(_ sender: Any?) {
        web.webView.pageZoom = max(web.webView.pageZoom - 0.1, 0.6)
    }

    @objc func resetPageZoom(_ sender: Any?) {
        web.webView.pageZoom = 1.0
    }
}
