import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, Text } from 'react-native';
import { useLoading } from '@/context/LoadingContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const GlobalLoader = () => {
    const { isLoading } = useLoading();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isLoading ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[styles.loaderBox, { backgroundColor: colors.background, shadowColor: colors.text }]}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.text, { color: colors.text }]}>Updating...</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    text: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: '600',
    },
});
