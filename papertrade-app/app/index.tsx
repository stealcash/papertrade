import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.content}>
                <View style={styles.header}>
                    {/* Placeholder for Logo if we had one */}
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>P</Text>
                    </View>
                    <Text style={styles.title}>PaperTrade</Text>
                    <Text style={styles.subtitle}>Master the markets without the risk.</Text>
                </View>

                <View style={styles.features}>
                    <FeatureItem icon="chart-line" text="Real-time Market Data" />
                    <FeatureItem icon="laptop" text="Virtual Portfolio" />
                    <FeatureItem icon="bolt" text="Test Strategies" />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/signup')}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function FeatureItem({ icon, text }: { icon: string, text: string }) {
    // Determine icon (using text for simplicity if FontAwesome isn't imported here, 
    // but better to keep it clean. We'll use simple text bullets for now or emojis)
    return (
        <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'space-between',
        paddingTop: 100,
        paddingBottom: 50,
    },
    header: {
        alignItems: 'center',
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: '#000',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    features: {
        alignItems: 'center',
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureBullet: {
        fontSize: 20,
        color: '#000',
    },
    featureText: {
        fontSize: 18,
        color: '#374151',
    },
    footer: {
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#000',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    secondaryButtonText: {
        color: '#1f2937',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
