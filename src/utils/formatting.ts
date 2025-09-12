// Utility functions for vehicle number formatting
export const formatVehicleNumber = (vehicleNo: string): string => {
    // Handle dash input specially
    if (vehicleNo.includes('-')) {
        // Split by dash and clean each part
        const parts = vehicleNo.split('-');
        const beforeDash = parts[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const afterDash = parts[1] ? parts[1].replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

        // If we have content before dash
        if (beforeDash.length > 0) {
            // Handle the case where user types 123- (numeric before dash)
            if (/^\d+$/.test(beforeDash)) {
                // If beforeDash is all numbers and has 2-3 digits, format as numbers-numbers
                if (beforeDash.length >= 2 && beforeDash.length <= 3) {
                    return afterDash.length > 0 ? `${beforeDash}-${afterDash.substring(0, 4)}` : `${beforeDash}-`;
                }
            }
            // Handle letters before dash (ABC-)
            else if (/^[A-Z]+$/.test(beforeDash)) {
                return afterDash.length > 0 ? `${beforeDash}-${afterDash.substring(0, 4)}` : `${beforeDash}-`;
            }
            // Handle mixed content before dash
            else {
                return afterDash.length > 0 ? `${beforeDash}-${afterDash.substring(0, 4)}` : `${beforeDash}-`;
            }
        }

        // If just dash or empty before dash, return as typed
        return vehicleNo;
    }

    // Remove all non-alphanumeric characters for auto-formatting
    const cleaned = vehicleNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // If less than 3 characters, return as-is (don't auto-format yet)
    if (cleaned.length < 3) {
        return cleaned;
    }

    // Check if it's a 300-series format (3 digits followed by letters)
    const match300Series = cleaned.match(/^(\d{3})([A-Z]+)$/);
    if (match300Series) {
        return `${match300Series[1]}-${match300Series[2]}`;
    }

    // For other formats, try to detect patterns
    // Pattern: ABC-1234 or ABC1234
    const matchLettersNumbers = cleaned.match(/^([A-Z]+)(\d+)$/);
    if (matchLettersNumbers) {
        return `${matchLettersNumbers[1]}-${matchLettersNumbers[2]}`;
    }

    // Pattern: 12-3456 or 123456 (but only if 6+ characters to avoid premature formatting)
    const matchNumbersOnly = cleaned.match(/^(\d{2,3})(\d{4,})$/);
    if (matchNumbersOnly) {
        return `${matchNumbersOnly[1]}-${matchNumbersOnly[2]}`;
    }

    // Return as-is if no pattern matches
    return cleaned;
};

export const validateVehicleNumber = (vehicleNo: string): boolean => {
    const cleaned = vehicleNo.replace(/[^a-zA-Z0-9-]/g, '');

    // Allow incomplete formats during typing (ending with dash)
    if (cleaned.endsWith('-')) {
        const beforeDash = cleaned.slice(0, -1);
        // Must have at least 2 characters before dash
        return beforeDash.length >= 2 && /^[A-Z0-9]+$/.test(beforeDash.toUpperCase());
    }

    // Accept various complete formats with dash
    return /^[A-Z0-9]+-[A-Z0-9]+$/.test(cleaned.toUpperCase());
};

export const isValidPhoneNumber = (phone: string): boolean => {
    // Sri Lankan phone number validation
    const cleaned = phone.replace(/[^0-9]/g, '');
    return /^(0\d{9}|\d{9})$/.test(cleaned);
};
