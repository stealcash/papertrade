import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, SafeAreaView, ScrollView, Modal, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { subscriptionsAPI } from '@/services/subscriptions';

export default function SubscriptionScreen() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [currentSub, setCurrentSub] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plansRes, currentRes] = await Promise.all([
                subscriptionsAPI.getPlans(),
                subscriptionsAPI.getCurrent()
            ]);
            setPlans(plansRes.data?.data || plansRes.data || []);
            const current = currentRes.data?.data || currentRes.data;
            setCurrentSub(current);
            if (current?.billing_period) {
                setBillingPeriod(current.billing_period);
            }
        } catch (error) {
            console.error('Failed to fetch subscription data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan: any) => {
        const currentPrice = currentSub?.billing_period === 'yearly' ? currentSub?.plan?.yearly_price : currentSub?.plan?.monthly_price;
        const newPrice = billingPeriod === 'yearly' ? plan.yearly_price : plan.monthly_price;

        if (plan.id === currentSub?.plan?.id && billingPeriod === currentSub?.billing_period) {
            Alert.alert("Current Plan", "You are already subscribed to this exact plan and billing cycle.");
            return;
        }

        if (currentSub?.is_active && newPrice < (currentPrice || 0)) {
            Alert.alert(
                "Downgrade Plan",
                "You are downgrading your current plan. You may lose access to advanced strategies and higher limits immediately/at cycle end.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Continue", onPress: () => {
                            setSelectedPlan(plan);
                            setCouponCode('');
                            setAppliedCoupon(null);
                            setCouponError('');
                            setIsModalOpen(true);
                        }
                    }
                ]
            );
            return;
        }

        setSelectedPlan(plan);
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
        setIsModalOpen(true);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !selectedPlan) return;
        setValidatingCoupon(true);
        setCouponError('');
        try {
            const res = await subscriptionsAPI.validateCoupon({
                code: couponCode,
                plan_id: selectedPlan.id,
                period: billingPeriod
            });
            setAppliedCoupon(res.data?.data || res.data);
        } catch (err: any) {
            setAppliedCoupon(null);
            setCouponError(err.response?.data?.message || "Invalid coupon");
        } finally {
            setValidatingCoupon(false);
        }
    };

    const confirmSubscribe = async () => {
        if (subscribing || !selectedPlan) return;

        setSubscribing(true);
        try {
            const res = await subscriptionsAPI.subscribe({
                plan_id: selectedPlan.id,
                period: billingPeriod,
                coupon_code: appliedCoupon ? appliedCoupon.code : undefined
            });

            if (res.data?.success || res.status === 200 || res.status === 201) {
                Alert.alert("Success", "Subscription successfully updated!");
                setIsModalOpen(false);
                fetchData();
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Subscription failed. Please check your wallet balance.";
            Alert.alert("Error", msg);
        } finally {
            setSubscribing(false);
        }
    };

    const renderPriceDetail = () => {
        if (!selectedPlan) return null;
        const originalPrice = billingPeriod === 'monthly' ? selectedPlan.monthly_price : selectedPlan.yearly_price;
        const discountAmount = appliedCoupon ? (originalPrice * (appliedCoupon.discount_percent / 100)) : 0;
        const finalPrice = Math.max(0, originalPrice - discountAmount);

        return (
            <View style={styles.priceDetailContainer}>
                <View style={styles.priceDetailRow}>
                    <Text style={styles.priceDetailLabel}>Plan Price ({billingPeriod})</Text>
                    <Text style={styles.priceDetailValue}>₹{originalPrice}</Text>
                </View>
                {appliedCoupon && (
                    <View style={styles.priceDetailRow}>
                        <Text style={[styles.priceDetailLabel, { color: '#16a34a' }]}>Discount ({appliedCoupon.discount_percent}%)</Text>
                        <Text style={[styles.priceDetailValue, { color: '#16a34a' }]}>- ₹{discountAmount.toFixed(2)}</Text>
                    </View>
                )}
                <View style={styles.priceDetailDivider} />
                <View style={styles.priceDetailRow}>
                    <Text style={styles.priceDetailTotalLabel}>Total Amount</Text>
                    <Text style={styles.priceDetailTotalValue}>₹{finalPrice.toFixed(2)}</Text>
                </View>
            </View>
        );
    };

    const renderPlan = ({ item }: { item: any }) => {
        const price = billingPeriod === 'monthly' ? item.monthly_price : item.yearly_price;
        if (price === null) return null;

        const isCurrent = item.id === currentSub?.plan?.id && billingPeriod === currentSub?.billing_period;

        return (
            <View style={[styles.planCard, isCurrent && styles.activePlanCard]}>
                {item.is_default && !isCurrent && (
                    <View style={styles.popularTag}>
                        <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                )}

                <View style={styles.planHeader}>
                    <Text style={styles.planName}>{item.name}</Text>
                    {isCurrent && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>CURRENT</Text></View>}
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceCurrency}>₹</Text>
                    <Text style={styles.planPrice}>{price}</Text>
                    <Text style={styles.planDuration}>/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</Text>
                </View>

                {item.description && (
                    <Text style={styles.description}>{item.description}</Text>
                )}

                <View style={styles.divider} />

                <Text style={styles.featureTitle}>WHAT'S INCLUDED</Text>
                <View style={styles.features}>
                    {item.features && Object.entries(item.features).map(([key, config]: any) => {
                        if (!config.enabled) return null;

                        const LABELS: any = {
                            'STRATEGY_CREATE': 'Strategy Creation',
                            'BACKTEST_RUN': 'Backtest Runs',
                            'TRADE_EXECUTE': 'Live Trades'
                        };
                        const label = LABELS[key] || key.replace(/_/g, ' ').toLowerCase();

                        return (
                            <View key={key} style={styles.featureItem}>
                                <FontAwesome name="check" size={12} color="#10b981" />
                                <Text style={styles.featureText}>
                                    <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{label}</Text>
                                    {config.limit > 0 ? ` (Limit: ${config.limit})` : config.limit === -1 ? ' (Unlimited)' : ''}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[
                        styles.subscribeBtn,
                        isCurrent ? styles.currentBtn : (item.is_default ? styles.popularBtn : styles.standardBtn),
                    ]}
                    onPress={() => handleOpenModal(item)}
                    disabled={isCurrent}
                >
                    <Text style={[styles.subscribeBtnText, isCurrent && styles.currentBtnText]}>
                        {isCurrent ? 'Current Plan' : 'Subscribe Now'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Subscriptions', headerShown: true }} />

            <View style={styles.topHeader}>
                <Text style={styles.title}>Subscription Plans</Text>
                <Text style={styles.subtitle}>Choose a plan that fits your usage & growth</Text>

                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'monthly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('monthly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, billingPeriod === 'yearly' && styles.toggleBtnActive]}
                        onPress={() => setBillingPeriod('yearly')}
                    >
                        <Text style={[styles.toggleText, billingPeriod === 'yearly' && styles.toggleTextActive]}>Yearly</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#0a7ea4" />
                </View>
            ) : (
                <FlatList
                    data={plans}
                    renderItem={renderPlan}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirm Subscription</Text>
                            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                                <FontAwesome name="times" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalBodyText}>
                                You are about to subscribe to the <Text style={{ fontWeight: 'bold' }}>{selectedPlan?.name}</Text> plan.
                            </Text>

                            {renderPriceDetail()}

                            <View style={styles.couponContainer}>
                                <Text style={styles.couponLabel}>Have a coupon?</Text>
                                <View style={styles.couponInputWrapper}>
                                    <TextInput
                                        style={[styles.couponInput, appliedCoupon && styles.couponInputDisabled]}
                                        value={couponCode}
                                        onChangeText={(val) => setCouponCode(val.toUpperCase())}
                                        placeholder="ENTER CODE"
                                        autoCapitalize="characters"
                                        editable={!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <TouchableOpacity
                                            onPress={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                            style={styles.couponActionBtn}
                                        >
                                            <Text style={[styles.couponActionText, { color: '#ef4444' }]}>Remove</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={handleApplyCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            style={styles.couponActionBtn}
                                        >
                                            {validatingCoupon ? (
                                                <ActivityIndicator size="small" color="#0a7ea4" />
                                            ) : (
                                                <Text style={styles.couponActionText}>Apply</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
                                {appliedCoupon ? <Text style={styles.couponSuccessText}>Coupon applied successfully!</Text> : null}
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setIsModalOpen(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, subscribing && { opacity: 0.7 }]}
                                onPress={confirmSubscribe}
                                disabled={subscribing}
                            >
                                {subscribing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Proceed</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    topHeader: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        textAlign: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 4,
        marginTop: 20,
        width: '60%',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    toggleTextActive: {
        color: '#1e293b',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        position: 'relative',
    },
    activePlanCard: {
        borderColor: '#10b981',
        borderWidth: 2,
    },
    popularTag: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#0a7ea4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    popularText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    activeBadge: {
        backgroundColor: '#10b981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    priceCurrency: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    planPrice: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1e293b',
    },
    planDuration: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 4,
    },
    description: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    featureTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    features: {
        marginBottom: 24,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        color: '#334155',
    },
    subscribeBtn: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    standardBtn: {
        backgroundColor: '#1e293b',
    },
    popularBtn: {
        backgroundColor: '#0a7ea4',
    },
    currentBtn: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#dcfce7',
    },
    subscribeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    currentBtnText: {
        color: '#16a34a',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    modalBody: {
        padding: 20,
    },
    modalBodyText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 20,
    },
    priceDetailContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    priceDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    priceDetailLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    priceDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    priceDetailDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 10,
    },
    priceDetailTotalLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    priceDetailTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    couponContainer: {
        marginBottom: 20,
    },
    couponLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    couponInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    couponInput: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    couponInputDisabled: {
        backgroundColor: '#f1f5f9',
        color: '#94a3b8',
    },
    couponActionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    couponActionText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0a7ea4',
    },
    couponErrorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 6,
    },
    couponSuccessText: {
        fontSize: 12,
        color: '#16a34a',
        marginTop: 6,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    confirmBtn: {
        flex: 2,
        padding: 14,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#1e293b',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
});
