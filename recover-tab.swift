import AppKit
import ApplicationServices

struct RecoveryError: Error {
    let status: Int
    let message: String
}

func attribute(_ element: AXUIElement, _ name: String) throws -> CFTypeRef? {
    var value: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(element, name as CFString, &value)
    if result == .attributeUnsupported || result == .noValue { return nil }
    guard result == .success else {
        throw RecoveryError(status: 502, message: "Could not read cmux's recovery menu (Accessibility \(result.rawValue)).")
    }
    return value
}

do {
    guard AXIsProcessTrusted() else {
        throw RecoveryError(status: 403, message: "Enable Accessibility for the app or Node executable running Pokemux in System Settings → Privacy & Security.")
    }
    let applications = NSRunningApplication.runningApplications(withBundleIdentifier: "com.cmuxterm.app")
    guard applications.count == 1, let url = applications[0].bundleURL, let bundle = Bundle(url: url) else {
        throw RecoveryError(status: 409, message: "A single running cmux app is required to recover a tab.")
    }
    let key = "menu.history.reopenLastClosed"
    let titles = Set(bundle.localizations.compactMap { language -> String? in
        guard let path = bundle.path(forResource: language, ofType: "lproj"), let localized = Bundle(path: path) else { return nil }
        let title = localized.localizedString(forKey: key, value: nil, table: nil)
        return title == key ? nil : title
    })
    let app = AXUIElementCreateApplication(applications[0].processIdentifier)
    guard let bar = try attribute(app, "AXMenuBar") else {
        throw RecoveryError(status: 502, message: "cmux's menu bar is unavailable.")
    }
    var recovery: AXUIElement?
    search: for menu in try attribute(bar as! AXUIElement, "AXChildren") as? [AXUIElement] ?? [] {
        for content in try attribute(menu, "AXChildren") as? [AXUIElement] ?? [] {
            for item in try attribute(content, "AXChildren") as? [AXUIElement] ?? [] {
                if let title = try attribute(item, "AXTitle") as? String, titles.contains(title) {
                    recovery = item
                    break search
                }
            }
        }
    }
    guard let recovery else {
        throw RecoveryError(status: 502, message: "This cmux version does not expose Reopen Last Closed in its menu.")
    }
    guard try attribute(recovery, "AXEnabled") as? Bool == true else {
        throw RecoveryError(status: 409, message: "No closed tabs to recover.")
    }
    let result = AXUIElementPerformAction(recovery, kAXPressAction as CFString)
    guard result == .success else {
        throw RecoveryError(status: 502, message: "cmux could not run Reopen Last Closed (Accessibility \(result.rawValue)).")
    }
} catch let error as RecoveryError {
    FileHandle.standardError.write(try JSONSerialization.data(withJSONObject: ["status": error.status, "message": error.message]))
    exit(2)
}
