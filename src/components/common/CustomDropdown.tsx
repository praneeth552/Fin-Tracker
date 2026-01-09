import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, useColorScheme, FlatList, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Typography } from './Typography';
import { themes, spacing } from '../../theme';

export interface DropdownOption {
    label: string;
    value: string;
    icon?: string;
    subtitle?: string;
}

interface CustomDropdownProps {
    options: DropdownOption[];
    value: string | null;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? themes.dark : themes.light;

    const [visible, setVisible] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (val: string) => {
        onChange(val);
        setVisible(false);
    };

    return (
        <View style={styles.wrapper}>
            {label && (
                <Typography variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                    {label}
                </Typography>
            )}

            <Pressable
                style={[
                    styles.trigger,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: visible ? colors.primary : 'transparent',
                    }
                ]}
                onPress={() => setVisible(true)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {selectedOption?.icon && (
                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#3F3F46' : '#E4E4E7' }]}>
                            <Typography variant="body">{selectedOption.icon}</Typography>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Typography
                            variant="body"
                            weight={selectedOption ? 'medium' : 'regular'}
                            style={{ color: selectedOption ? colors.text : colors.textMuted }}
                        >
                            {selectedOption ? selectedOption.label : placeholder}
                        </Typography>
                        {selectedOption?.subtitle && (
                            <Typography variant="caption" color="secondary">
                                {selectedOption.subtitle}
                            </Typography>
                        )}
                    </View>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                        <View style={styles.header}>
                            <Typography variant="h3" weight="semibold">Select {label || 'Option'}</Typography>
                            <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
                                <Icon name="close" size={20} color={colors.text} />
                            </Pressable>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={item => item.value}
                            contentContainerStyle={{ paddingBottom: spacing.lg }}
                            renderItem={({ item }) => {
                                const isSelected = item.value === value;
                                return (
                                    <Pressable
                                        style={[
                                            styles.optionItem,
                                            isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                                        ]}
                                        onPress={() => handleSelect(item.value)}
                                    >
                                        <View style={[styles.optionIcon, { backgroundColor: isDark ? '#3F3F46' : '#E4E4E7' }]}>
                                            <Typography variant="body">{item.icon || '📌'}</Typography>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Typography variant="body" weight={isSelected ? 'bold' : 'medium'}>
                                                {item.label}
                                            </Typography>
                                            {item.subtitle && (
                                                <Typography variant="caption" color="secondary">
                                                    {item.subtitle}
                                                </Typography>
                                            )}
                                        </View>
                                        {isSelected && (
                                            <Icon name="check" size={20} color={colors.primary} />
                                        )}
                                    </Pressable>
                                );
                            }}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { marginBottom: 16 },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', // Bottom sheet style
    },
    modalContent: {
        width: '100%',
        maxHeight: '60%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(150,150,150,0.1)',
        borderRadius: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 4,
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
});
