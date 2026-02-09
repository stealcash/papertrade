import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';

export default function PrivacyScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Privacy Policy', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>Last Updated: January 2026</Text>

                <Text style={[styles.heading, { color: colors.text }]}>1. Introduction</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    Welcome to PaperTrade. We value your privacy and are committed to protecting your personal data.
                    This policy explains how we collect, use, and safeguard your information.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Data Collection</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    We collect information you provide directly to us, such as your name, email address, and phone number when you register.
                    We also track your simulated trading activities for the purpose of maintaining your portfolio and performance history.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. Use of Information</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    We use your information to operate the PaperTrade app, improved our services, and communicate with you about updates or security alerts.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Data Security</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    We implement appropriate technical measures to protect your personal data against unauthorized access or disclosure.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>5. Contact Us</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    If you have any questions about this Privacy Policy, please contact us at support@papertrade.com.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        marginBottom: 32,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
});
