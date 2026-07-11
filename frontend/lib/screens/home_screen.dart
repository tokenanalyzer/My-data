import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_providers.dart';
import '../providers/theme_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();
  static const _sources = ['IndiaMART', 'TradeIndia', 'LinkedIn', 'Custom'];
  var _selectedSource = _sources.first;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _startSearch() {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter a business or industry to search.'),
        ),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Searching $query on $_selectedSource...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Data'),
        actions: [
          IconButton(
            tooltip: themeMode == ThemeMode.dark
                ? 'Use light theme'
                : 'Use dark theme',
            icon: Icon(
              themeMode == ThemeMode.dark
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined,
            ),
            onPressed: () => ref.read(themeModeProvider.notifier).state =
                themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
          ),
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(firebaseAuthProvider).signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Find your next lead',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Search trusted sources and keep your prospecting focused.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 32),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _searchController,
                          textInputAction: TextInputAction.search,
                          onSubmitted: (_) => _startSearch(),
                          decoration: const InputDecoration(
                            labelText: 'What business are you looking for?',
                            hintText: 'e.g. digital agencies in Mumbai',
                            prefixIcon: Icon(Icons.search),
                          ),
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedSource,
                          decoration: const InputDecoration(
                            labelText: 'Source',
                            prefixIcon: Icon(Icons.public),
                          ),
                          items: _sources
                              .map(
                                (source) => DropdownMenuItem(
                                  value: source,
                                  child: Text(source),
                                ),
                              )
                              .toList(),
                          onChanged: (value) => value == null
                              ? null
                              : setState(() => _selectedSource = value),
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: _startSearch,
                          icon: const Icon(Icons.travel_explore),
                          label: const Padding(
                            padding: EdgeInsets.all(12),
                            child: Text('Start search'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const _TipCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  const _TipCard();

  @override
  Widget build(BuildContext context) => Card(
    color: Theme.of(context).colorScheme.secondaryContainer,
    child: const Padding(
      padding: EdgeInsets.all(20),
      child: Row(
        children: [
          Icon(Icons.tips_and_updates_outlined),
          SizedBox(width: 14),
          Expanded(
            child: Text(
              'Use a location and business type for more useful results.',
            ),
          ),
        ],
      ),
    ),
  );
}
