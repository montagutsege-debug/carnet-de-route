import CoreLocation
import Foundation

/// Position actuelle via le service de localisation de macOS (Wi-Fi sur un iMac),
/// pour le bouton « cible » des coordonnées GPS d'une fiche.
final class LocationProvider: NSObject, CLLocationManagerDelegate {
    enum Failure: Error {
        case denied
        case timeout
    }

    private let manager = CLLocationManager()
    private var pending: [(Result<CLLocation, Error>) -> Void] = []

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestLocation(_ completion: @escaping (Result<CLLocation, Error>) -> Void) {
        pending.append(completion)
        guard pending.count == 1 else { return } // a request is already running

        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            self?.finish(.failure(Failure.timeout))
        }

        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization() // macOS shows its permission dialog
        case .denied, .restricted:
            finish(.failure(Failure.denied))
        default:
            manager.requestLocation()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard !pending.isEmpty else { return }
        switch manager.authorizationStatus {
        case .notDetermined:
            return
        case .denied, .restricted:
            finish(.failure(Failure.denied))
        default:
            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last {
            finish(.success(location))
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if let clError = error as? CLError, clError.code == .denied {
            finish(.failure(Failure.denied))
        } else {
            finish(.failure(error))
        }
    }

    private func finish(_ result: Result<CLLocation, Error>) {
        guard !pending.isEmpty else { return }
        let callbacks = pending
        pending = []
        callbacks.forEach { $0(result) }
    }
}
