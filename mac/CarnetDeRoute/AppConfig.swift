import Foundation

/// Réglages de l'application Mac.
enum AppConfig {
    /// Facultatif. Laissez vide : l'application demande alors votre clé Gemini au premier
    /// usage des suggestions et interroge Gemini directement (clé gardée dans le trousseau).
    /// Si vous mettez votre appli en ligne sur Vercel, vous pouvez indiquer son adresse ici
    /// (ex. "https://carnet-de-route-xxx.vercel.app") pour passer par elle à la place.
    static let suggestionsServer = ""
}
