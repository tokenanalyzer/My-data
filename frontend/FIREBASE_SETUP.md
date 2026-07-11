# Firebase setup

Authentication is implemented with Firebase email/password sign-in. Before running on a device:

1. Create or select a Firebase project and enable **Email/Password** under Authentication providers.
2. Register each app target (Android, iOS, macOS, Windows, or web) in that project.
3. Run `flutterfire configure` from this directory. It creates `lib/firebase_options.dart` and platform configuration files.
4. Update `firebaseInitializationProvider` to call `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)` after the generated options file is available.

The current initialization deliberately surfaces a clear in-app configuration error until those project-specific files are added. Do not commit credentials that are not intended for this app's Firebase project.

For the search API, pass the endpoint at build time instead of hard-coding it:

```text
flutter run --dart-define=API_BASE_URL=https://api.example.com/api
```
