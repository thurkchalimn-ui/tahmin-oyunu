import { useState, type FormEvent } from 'react';
import { useAvatarOptions } from '@/hooks/useAvatarOptions';
import { addAvatarOption, removeAvatarOption } from '@/services/avatarOptionsService';
import { getTeamLogoByName } from '@/services/matchService';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { isNonEmpty } from '@/utils/validators';

/**
 * Admin panelinde, kullanıcıların profil avatarı olarak seçebileceği sabit
 * logo listesini yönetir. Kullanıcılar SADECE bu listeden seçim yapabilir,
 * kendi görsel linki giremez - listenin tamamı admin kontrolündedir.
 */
export function AdminAvatarOptions() {
  const { data: options, loading, error } = useAvatarOptions();
  const [label, setLabel] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLabelBlur() {
    if (!isNonEmpty(label) || isNonEmpty(logoUrl)) return;
    setIsSearching(true);
    try {
      const found = await getTeamLogoByName(label);
      if (found) setLogoUrl(found);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!isNonEmpty(label) || !isNonEmpty(logoUrl)) {
      setFormError('Etiket ve görsel linki boş bırakılamaz.');
      return;
    }
    setIsSaving(true);
    try {
      await addAvatarOption(label, logoUrl);
      setLabel('');
      setLogoUrl('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Eklenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-2 rounded-lg border border-pitch-700/15 bg-white p-3
          dark:border-pitch-700 dark:bg-pitch-800 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
          Takım / Etiket Adı
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            placeholder="Ör. Galatasaray"
            className="rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 text-sm dark:border-pitch-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-pitch-900 dark:text-pitch-100">
          Logo Linki (etiketten otomatik aranır)
          <div className="flex items-center gap-2">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-pitch-700/20 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-pitch-700"
            />
            {isSearching ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-scoreboard-amber border-t-transparent" />
            ) : (
              logoUrl && <Avatar avatarUrl={logoUrl} size="sm" />
            )}
          </div>
        </label>
        {formError && <p className="text-xs text-pick-wrong sm:col-span-2">{formError}</p>}
        <Button type="submit" isLoading={isSaving} className="!px-3 !py-1.5 text-xs sm:col-span-2">
          Listeye Ekle
        </Button>
      </form>

      {loading ? (
        <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">Yükleniyor...</p>
      ) : error ? (
        <p className="text-sm text-pick-wrong">{error}</p>
      ) : options && options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <div
              key={opt.key}
              className="flex items-center gap-1.5 rounded-full bg-pitch-700/5 py-1 pl-1 pr-2 dark:bg-pitch-700/40"
            >
              <Avatar avatarUrl={opt.logoUrl} size="sm" />
              <span className="font-mono text-xs text-pitch-900 dark:text-pitch-100">{opt.label}</span>
              <button
                type="button"
                onClick={() => removeAvatarOption(opt.key)}
                aria-label={`${opt.label} seçeneğini sil`}
                className="ml-1 font-mono text-xs text-pick-wrong hover:underline"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
          Henüz avatar seçeneği eklenmedi.
        </p>
      )}
    </div>
  );
}
