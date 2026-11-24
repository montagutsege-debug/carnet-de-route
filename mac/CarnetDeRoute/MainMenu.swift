import AppKit

/// Barre de menus (en français) : sans elle, Cmd+C / Cmd+V / Cmd+Q ne fonctionnent pas.
enum MainMenu {
    static func build() -> NSMenu {
        let main = NSMenu()
        let appName = "Carnet de Route"

        // Menu de l'application
        let appMenu = NSMenu(title: appName)
        appMenu.addItem(withTitle: "À propos de \(appName)",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Clé Gemini…",
                        action: #selector(AppDelegate.editGeminiKey(_:)),
                        keyEquivalent: ",")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Masquer \(appName)",
                        action: #selector(NSApplication.hide(_:)),
                        keyEquivalent: "h")
        let hideOthers = appMenu.addItem(withTitle: "Masquer les autres",
                                         action: #selector(NSApplication.hideOtherApplications(_:)),
                                         keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Tout afficher",
                        action: #selector(NSApplication.unhideAllApplications(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quitter \(appName)",
                        action: #selector(NSApplication.terminate(_:)),
                        keyEquivalent: "q")
        addSubmenu(appMenu, to: main)

        // Édition (copier-coller dans les champs du carnet)
        let edit = NSMenu(title: "Édition")
        edit.addItem(withTitle: "Annuler", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = edit.addItem(withTitle: "Rétablir", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        edit.addItem(.separator())
        edit.addItem(withTitle: "Couper", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copier", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Coller", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Tout sélectionner", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        addSubmenu(edit, to: main)

        // Présentation
        let view = NSMenu(title: "Présentation")
        view.addItem(withTitle: "Taille réelle",
                     action: #selector(AppDelegate.resetPageZoom(_:)),
                     keyEquivalent: "0")
        view.addItem(withTitle: "Agrandir le texte",
                     action: #selector(AppDelegate.zoomInPage(_:)),
                     keyEquivalent: "+")
        view.addItem(withTitle: "Réduire le texte",
                     action: #selector(AppDelegate.zoomOutPage(_:)),
                     keyEquivalent: "-")
        view.addItem(.separator())
        let fullScreen = view.addItem(withTitle: "Plein écran",
                                      action: #selector(NSWindow.toggleFullScreen(_:)),
                                      keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]
        addSubmenu(view, to: main)

        // Fenêtre
        let window = NSMenu(title: "Fenêtre")
        window.addItem(withTitle: "Placer dans le Dock",
                       action: #selector(NSWindow.performMiniaturize(_:)),
                       keyEquivalent: "m")
        window.addItem(withTitle: "Réduire / agrandir",
                       action: #selector(NSWindow.performZoom(_:)),
                       keyEquivalent: "")
        addSubmenu(window, to: main)
        NSApp.windowsMenu = window

        return main
    }

    private static func addSubmenu(_ submenu: NSMenu, to main: NSMenu) {
        let item = NSMenuItem(title: submenu.title, action: nil, keyEquivalent: "")
        item.submenu = submenu
        main.addItem(item)
    }
}
