import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { Card, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';

const API_URL = 'http://your-backend-url:5000/api';

export default function HomeScreen() {
  const [source, setSource] = useState('indiamart');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [jobId, setJobId] = useState(null);

  const startScraping = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/scraper/start`, {
        source,
        query,
        limit: 100
      });

      setJobId(response.data.jobId);
      Alert.alert('Success', 'Scraping started! Check progress below.');
      
      // Poll for results
      pollResults(response.data.jobId);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start scraping');
    } finally {
      setLoading(false);
    }
  };

  const pollResults = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/scraper/status/${id}`);
      if (response.data.status === 'completed') {
        fetchData();
      } else {
        setTimeout(() => pollResults(id), 2000);
      }
    } catch (error) {
      console.error('Error polling results:', error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_URL}/data?source=${source}`);
      setResults(response.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    }
  };

  const exportData = async (format = 'csv') => {
    try {
      await axios.post(`${API_URL}/data/export`, { format });
      Alert.alert('Success', `Data exported as ${format.toUpperCase()}!`);
    } catch (error) {
      Alert.alert('Error', 'Export failed');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>🔍 Start Scraping</Text>
          
          <View style={styles.sourceButtons}>
            {['indiamart', 'tradekey', 'linkedin', 'custom'].map(src => (
              <TouchableOpacity
                key={src}
                style={[styles.sourceBtn, source === src && styles.sourceBtnActive]}
                onPress={() => setSource(src)}
              >
                <Text style={styles.sourceBtnText}>{src.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="Search Query (e.g., valve manufacturer)"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            placeholder="Type your search..."
          />

          <Button 
            mode="contained" 
            onPress={startScraping}
            loading={loading}
            disabled={loading}
            style={styles.btn}
          >
            {loading ? 'Scraping...' : 'Start Scraping'}
          </Button>
        </Card.Content>
      </Card>

      {results.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.subtitle}>📊 Results ({results.length})</Text>
            
            {results.map((item, idx) => (
              <View key={idx} style={styles.resultItem}>
                <Text style={styles.companyName}>{item.companyName}</Text>
                <Text style={styles.detail}>📞 {item.phone}</Text>
                <Text style={styles.detail}>📧 {item.email}</Text>
                <Text style={styles.detail}>🌐 {item.website}</Text>
              </View>
            ))}

            <View style={styles.exportBtns}>
              <Button mode="outlined" onPress={() => exportData('csv')} style={styles.exportBtn}>
                Export CSV
              </Button>
              <Button mode="outlined" onPress={() => exportData('xlsx')} style={styles.exportBtn}>
                Export Excel
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15
  },
  card: {
    marginBottom: 15,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  sourceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap'
  },
  sourceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
    flex: 1,
    marginRight: 5
  },
  sourceBtnActive: {
    backgroundColor: '#007AFF'
  },
  sourceBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff'
  },
  btn: {
    marginTop: 10,
    paddingVertical: 8
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5
  },
  detail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3
  },
  exportBtns: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between'
  },
  exportBtn: {
    flex: 1,
    marginHorizontal: 5
  }
});
