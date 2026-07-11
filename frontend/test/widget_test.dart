import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/models/company_model.dart';
import 'package:frontend/services/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('company parsing supplies a safe fallback name', () {
    final company = Company.fromJson(<String, dynamic>{});

    expect(company.name, 'Unnamed company');
  });

  test('company parsing keeps optional metadata', () {
    final company = Company.fromJson(<String, dynamic>{
      'name': 'Acme Ltd',
      'website': 'https://acme.example',
      'location': 'Mumbai',
    });

    expect(company.name, 'Acme Ltd');
    expect(company.website, 'https://acme.example');
    expect(company.location, 'Mumbai');
  });

  test('API failures expose an application-safe error', () async {
    final service = ApiService(
      client: MockClient((request) async => http.Response('Unavailable', 503)),
      baseUrl: 'https://api.example/api',
    );

    await expectLater(
      service.searchCompanies(source: 'Custom', query: 'agency'),
      throwsA(isA<ApiException>()),
    );
    service.dispose();
  });

  test('search request maps a valid company response', () async {
    final service = ApiService(
      baseUrl: 'https://api.example/api',
      client: MockClient((request) async {
        expect(request.url.path, '/api/search');
        expect(jsonDecode(request.body), <String, dynamic>{
          'source': 'Custom',
          'query': 'agency',
        });
        return http.Response(
          jsonEncode([
            {
              'name': 'Acme Ltd',
              'website': 'https://acme.example',
              'location': 'Mumbai',
            },
          ]),
          200,
        );
      }),
    );

    final companies = await service.searchCompanies(
      source: 'Custom',
      query: 'agency',
    );

    expect(companies, hasLength(1));
    expect(companies.single.name, 'Acme Ltd');
    service.dispose();
  });
}
