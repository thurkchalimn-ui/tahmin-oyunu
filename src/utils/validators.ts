/** Basit e-posta format kontrolü. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Firebase Authentication minimum şifre uzunluğu kuralı (6 karakter). */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/** Takım adı gibi boş olmaması gereken kısa metin alanları için. */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/** Firebase Auth hata kodlarını kullanıcı dostu Türkçe mesajlara çevirir. */
export function translateAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/user-not-found': 'Kullanıcı bulunamadı.',
    'auth/wrong-password': 'Hatalı şifre.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
    'auth/network-request-failed': 'Ağ bağlantısı hatası. İnternetinizi kontrol edin.',
  };
  return map[code] ?? 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}
