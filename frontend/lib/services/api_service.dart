import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/company_model.dart';

class ApiService {
  ApiService({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl ?? ApiService.baseUrl;
  static const baseUrl = String.fromEnvironment('API_BASE_URL');
  static const _timeout = Duration(seconds: 15);
  final http.Client _client;
  final String _baseUrl;
  Future<List<Company>> searchCompanies({
    required String source,
    required String query,
  }) async {
    if (_baseUrl.isEmpty) {
      throw const ApiException('API_BASE_URL has not been configured.');
    }
    try {
      final response = await _client
          .post(
            Uri.parse('$_baseUrl/search'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'source': source, 'query': query}),
          )
          .timeout(_timeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException('Search failed (${response.statusCode}).');
      }
      final payload = jsonDecode(response.body);
      if (payload is! List) {
        throw const ApiException(
          'The server returned an invalid search response.',
        );
      }
      return payload
          .whereType<Map<String, dynamic>>()
          .map(Company.fromJson)
          .toList(growable: false);
    } on TimeoutException {
      throw const ApiException('The search request timed out.');
    } on http.ClientException {
      throw const ApiException('Unable to reach the search service.');
    } on FormatException {
      throw const ApiException(
        'The server returned an invalid search response.',
      );
    }
  }

  void dispose() => _client.close();
}

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}
