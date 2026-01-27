/**
 * Detected Account Modal
 * =======================
 * Prompts user to add a newly detected bank account
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable, useColorScheme } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './common';
import { themes, spacing } from '../theme';

interface DetectedAccountModalProps {
    visible: boolean;
    bankName: string;
    accountNumber: string;
    onConfirm: () => void;
    onIgnore: () => void;
}

export const DetectedAccountModal: React.FC<DetectedAccountModalProps> = ({
    visible,
    bankName,
    accountNumber,
    onConfirm,
    onIgnore,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const bgColor = isDark ? colors.card : '#FFFFFF';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onIgnore}>
            <Pressable style={styles.backdrop} onPress={onIgnore}>
                <View style={[styles.modal, { backgroundColor: bgColor }]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Icon name="bank-plus" size={32} color={colors.primary} />
                            </View>
                        </View>

                        <Typography variant="h3" weight="semibold" align="center" style={{ marginBottom: 8 }}>
                            New Account Detected
                        </Typography>

                        <Typography variant="body" color="secondary" align="center" style={{ marginBottom: 24 }}>
                            We detected activity from <Typography weight="bold">{bankName}</Typography> ending in <Typography weight="bold">xx{accountNumber}</Typography>.
                            {
/* This is the only part that needed correction. The original had "\n\n" which is an escaped newline. It should be a literal newline character. */
}
                            

                            Would you like to add this account to your wallet for automatic tracking?
                        </Typography>

                        <View style={styles.buttons}>
                            <Pressable
                                style={[styles.btn, styles.ignoreBtn, { borderColor: colors.border }]}
                                onPress={onIgnore}
                            >
                                <Typography variant="body" color="secondary">No, ignore</Typography>
                            </Pressable>
                            <Pressable
                                style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.primary }]}
                                onPress={onConfirm}
                            >
                                <Typography variant="body" weight="semibold" style={{ color: '#FFF' }}>Yes, add it</Typography>
                            </Pressable>
                        </View>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modal: {
        width: '100%',
        borderRadius: 24,
        padding: spacing.xl,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ignoreBtn: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    confirmBtn: {
        elevation: 2,
    },
});

export default DetectedAccountModal;
