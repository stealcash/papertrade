import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/Colors';

export default function TermsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Terms of Service', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>Last Updated: January 2026</Text>

                <Text style={[styles.heading, { color: colors.text }]}>1. Acceptance of Terms</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    By accessing or using the PaperTrade app, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>2. Educational Purpose Only</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    PaperTrade is a simulation platform designed for educational purposes.
                    No real money is involved, and trading results in the app do not guarantee future performance in real markets.
                    We are not financial advisors.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>3. User Accounts</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>4. Prohibited Conduct</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    You agree not to misuse the app, attempt to interfere with its operation, or use it for any illegal activities.
                </Text>

                <Text style={[styles.heading, { color: colors.text }]}>5. Termination</Text>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    We reserve the right to suspend or terminate your account at our discretion if you violate these Terms.
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
