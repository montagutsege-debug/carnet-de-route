import Foundation

/// Réglages de l'application Mac.
enum AppConfig {
    /// Adresse de votre appli en ligne sur Vercel, pour les suggestions « aux alentours »
    /// (Gemini). Exemple : "https://carnet-de-route-xxx.vercel.app".
    /// Laissez vide si l'appli n'est pas en ligne : tout le reste fonctionne sans.
    static let suggestionsServer = ""
}
