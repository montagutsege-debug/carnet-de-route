import Foundation

/// Suggestions « aux alentours » demandées directement à Gemini depuis le Mac
/// (mêmes consignes que la version web, sans passer par un serveur).
enum GeminiClient {
    struct Reply {
        let status: Int
        let body: [String: Any]
    }

    /// Tried in order: the next one is used when a model is overloaded or unavailable.
    static let models = ["gemini-3.5-flash", "gemini-4-hydrogen", "gemini-3.8-flash"]

    static func suggestions(input: [String: Any], apiKey: String, completion: @escaping (Reply) -> Void) {
        guard let lat = input["lat"] as? Double, let lng = input["lng"] as? Double,
              (-90...90).contains(lat), (-180...180).contains(lng)
        else {
            completion(Reply(status: 400, body: [
                "error": "Coordonnées GPS invalides. Renseignez une latitude et une longitude valides.",
            ]))
            return
        }
        let prompt = buildPrompt(lat: lat, lng: lng, input: input)
        attempt(modelIndex: 0, lastStatus: 0, prompt: prompt, apiKey: apiKey, lat: lat, lng: lng, completion: completion)
    }

    private static func clean(_ value: Any?) -> String {
        guard let text = value as? String else { return "" }
        return String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(120))
    }

    private static func buildPrompt(lat: Double, lng: Double, input: [String: Any]) -> String {
        let context = [clean(input["nomAire"]), clean(input["commune"]), clean(input["regionPays"])]
            .filter { !$0.isEmpty }
        let locationHint = context.isEmpty
            ? "Aucun nom de commune renseigné, base-toi uniquement sur le point GPS."
            : "Lieu indiqué sur la fiche : \(context.joined(separator: ", "))."
        return [
            "Tu es un guide de voyage francophone pour voyageurs en camping-car et fourgon.",
            "Point GPS exact de l'étape : latitude \(String(format: "%.5f", lat)), longitude \(String(format: "%.5f", lng)).",
            locationHint,
            "Propose en français des suggestions concrètes, fiables et réellement situées autour de ce point GPS (dans un rayon raisonnable d'environ 15 à 25 km), organisées exactement en 3 rubriques Markdown :",
            "",
            "### Visites incontournables aux alentours",
            "- 3 à 4 lieux à voir absolument (patrimoine, villages, sites remarquables, points de vue) avec une courte phrase utile et la distance approximative.",
            "",
            "### Randonnées & balades",
            "- 2 à 3 idées de randonnées, sentiers côtiers, boucles nature ou balades accessibles autour du point GPS (avec niveau ou durée indicative).",
            "",
            "### À manger : plats locaux & bonnes adresses",
            "- Les spécialités culinaires, plats typiques ou produits du terroir à goûter dans ce secteur, accompagnés de 2 à 3 bonnes adresses locales (restaurants, marchés, fermes, boulangeries ou crêperies) proches du point GPS.",
            "",
            "Reste concis, naturel et pratique pour un carnet de voyage. N'invente aucun lieu inexistant.",
        ].joined(separator: "\n")
    }

    private static func attempt(modelIndex: Int, lastStatus: Int, prompt: String, apiKey: String,
                                lat: Double, lng: Double, completion: @escaping (Reply) -> Void) {
        guard modelIndex < models.count else {
            completion(lastStatus == 429
                ? Reply(status: 429, body: ["error": "Quota Gemini temporairement atteint. Réessayez dans quelques instants."])
                : Reply(status: 503, body: ["error": "Gemini est très sollicité en ce moment. Réessayez dans quelques minutes."]))
            return
        }

        let model = models[modelIndex]
        var request = URLRequest(
            url: URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent")!,
            timeoutInterval: 90
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-goog-api-key")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "contents": [["parts": [["text": prompt]]]],
        ])

        URLSession.shared.dataTask(with: request) { data, response, error in
            if error != nil {
                completion(Reply(status: 502, body: [
                    "error": "Pas de connexion Internet : les suggestions seront disponibles dès que vous aurez du réseau.",
                ]))
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 500
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]

            if [404, 429, 500, 503].contains(status) {
                attempt(modelIndex: modelIndex + 1, lastStatus: status, prompt: prompt, apiKey: apiKey,
                        lat: lat, lng: lng, completion: completion)
                return
            }

            if status == 400 || status == 401 || status == 403 {
                let message = ((json["error"] as? [String: Any])?["message"] as? String) ?? ""
                if status != 400 || message.localizedCaseInsensitiveContains("API key") {
                    completion(Reply(status: 403, body: [
                        "error": "Clé Gemini refusée. Cliquez à nouveau sur le bouton pour saisir une autre clé.",
                    ]))
                    return
                }
            }

            let parts = (((json["candidates"] as? [[String: Any]])?.first?["content"] as? [String: Any])?["parts"]
                as? [[String: Any]]) ?? []
            let markdown = parts.compactMap { $0["text"] as? String }.joined()
                .trimmingCharacters(in: .whitespacesAndNewlines)

            guard status == 200, !markdown.isEmpty else {
                completion(Reply(status: 502, body: [
                    "error": "Aucune suggestion n’a pu être trouvée autour de ce point GPS.",
                ]))
                return
            }

            completion(Reply(status: 200, body: [
                "markdown": markdown,
                "places": [Any](),
                "coordinatesKey": String(format: "%.4f,%.4f", lat, lng),
                "generatedAt": ISO8601DateFormatter().string(from: Date()),
            ]))
        }.resume()
    }
}
