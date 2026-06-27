import * as LocalAuthentication from 'expo-local-authentication';

/** Whether the device has biometrics set up (hardware + enrolled). */
export async function canUseBiometrics(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

/** Prompt for biometric unlock. Returns whether it succeeded. */
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquear memory ev',
    cancelLabel: 'Cancelar',
  });
  return result.success;
}
