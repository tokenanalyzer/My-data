class Company {
  const Company({required this.name, this.website, this.location});
  final String name;
  final String? website;
  final String? location;
  factory Company.fromJson(Map<String, dynamic> json) => Company(
    name: json['name'] as String? ?? 'Unnamed company',
    website: json['website'] as String?,
    location: json['location'] as String?,
  );
}
