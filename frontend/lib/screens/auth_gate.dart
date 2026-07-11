import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initialization = ref.watch(firebaseInitializationProvider);
    return initialization.when(
      loading: () => const _LoadingScreen(),
      error: (error, _) => _ConfigurationError(error: error),
      data: (_) {
        final auth = ref.watch(authStateProvider);
        return auth.when(
          loading: () => const _LoadingScreen(),
          error: (error, _) => _ConfigurationError(error: error),
          data: (user) =>
              user == null ? const LoginScreen() : const HomeScreen(),
        );
      },
    );
  }
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();
  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class _ConfigurationError extends StatelessWidget {
  const _ConfigurationError({required this.error});
  final Object error;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'Firebase could not start. Add this app to your Firebase project '
          'and include its platform configuration files.\n\n$error',
          textAlign: TextAlign.center,
        ),
      ),
    ),
  );
}
