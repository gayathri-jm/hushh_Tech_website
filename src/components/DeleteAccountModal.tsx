import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import config from "../resources/config/config";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
}

/**
 * iOS-native style Delete Account dialog.
 * Backend logic is preserved — only UI is redesigned.
 */
const DeleteAccountModal = ({
  isOpen,
  onClose,
  onAccountDeleted,
}: DeleteAccountModalProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isDeleteEnabled = confirmText.toUpperCase() === "DELETE";

  // =====================================================
  // Backend logic — UNCHANGED
  // =====================================================
  const handleDeleteAccount = async () => {
    if (!isDeleteEnabled || !config.supabaseClient) return;

    setIsDeleting(true);

    try {
      console.log("[DeleteAccount] Starting account deletion process...");

      const { data: refreshData, error: refreshError } =
        await config.supabaseClient.auth.refreshSession();

      let accessToken: string | null = null;

      if (refreshError) {
        console.error("[DeleteAccount] Session refresh failed:", refreshError);
        const {
          data: { session: fallbackSession },
        } = await config.supabaseClient.auth.getSession();

        if (!fallbackSession?.access_token) {
          throw new Error(
            "Session expired. Please log out and log in again to delete your account."
          );
        }

        console.log("[DeleteAccount] Using fallback session...");
        accessToken = fallbackSession.access_token;
      } else if (refreshData.session?.access_token) {
        console.log("[DeleteAccount] Session refreshed successfully");
        accessToken = refreshData.session.access_token;
      } else {
        console.error("[DeleteAccount] No session after refresh");
        throw new Error(
          "Unable to verify your session. Please log out and log in again."
        );
      }

      console.log("[DeleteAccount] Calling delete endpoint...");
      const supabaseUrl = config.SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-user-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("[DeleteAccount] Edge function error:", data);
        throw new Error(data.error || "Failed to delete account");
      }

      console.log("[DeleteAccount] Account deleted successfully");

      localStorage.setItem("accountJustDeleted", "true");
      const keysToRemove = Object.keys(localStorage).filter(
        (key) => key !== "accountJustDeleted"
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      await config.supabaseClient.auth.signOut();

      toast({
        title: t("deleteAccount.successTitle"),
        description: t("deleteAccount.successMessage"),
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      setTimeout(() => {
        onAccountDeleted();
      }, 500);
    } catch (error: any) {
      console.error("[DeleteAccount] Error:", error);
      toast({
        title: t("deleteAccount.errorTitle"),
        description: error.message || t("deleteAccount.errorMessage"),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  if (!isOpen) return null;

  // =====================================================
  // iOS Native Alert UI
  // =====================================================
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-6"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[320px] bg-white rounded-[14px] overflow-hidden shadow-2xl"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content Area */}
        <div className="px-5 pt-5 pb-4">
          {/* Warning Icon + Title */}
          <div className="flex items-center justify-center mb-2">
            <span
              className="material-symbols-outlined text-[#FF3B30] mr-2 text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
            >
              warning
            </span>
            <h3 className="text-[17px] font-semibold text-black leading-tight">
              {t("deleteAccount.title")}
            </h3>
          </div>

          {/* Warning message */}
          <p className="text-[13px] text-[#8E8E93] text-center leading-[1.5] mb-4">
            {t("deleteAccount.warningMessage")}
          </p>

          {/* What will be deleted — iOS grouped card */}
          <div className="bg-[#F2F2F7] rounded-[10px] px-4 py-3 mb-4">
            <p className="text-[13px] font-medium text-black mb-2">
              {t("deleteAccount.willDelete")}
            </p>
            <ul className="space-y-1.5">
              {[
                t("deleteAccount.deleteItem1"),
                t("deleteAccount.deleteItem2"),
                t("deleteAccount.deleteItem3"),
                t("deleteAccount.deleteItem4"),
                "All your Hushh AI chats and conversations",
                "All uploaded media files (images, documents)",
                "Your AI chat history and preferences",
              ].map((item, i) => (
                <li
                  key={i}
                  className="text-[13px] text-[#8E8E93] leading-[1.4] flex items-start"
                >
                  <span className="text-[#8E8E93] mr-1.5 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation input */}
          <p className="text-[13px] font-medium text-black mb-2">
            {t("deleteAccount.confirmPrompt")}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="w-full h-[44px] rounded-[10px] bg-[#F2F2F7] border border-[#E5E5EA] px-4 text-[15px] text-black font-mono tracking-[2px] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* iOS-style stacked action buttons with hairline separators */}
        <div className="border-t border-[#C6C6C8]">
          {/* Cancel Button — iOS style: bold, blue */}
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full h-[44px] text-[17px] font-semibold text-[#007AFF] active:bg-[#E5E5EA] transition-colors disabled:opacity-50"
          >
            {t("deleteAccount.cancel")}
          </button>

          {/* Hairline separator */}
          <div className="h-[0.5px] bg-[#C6C6C8]" />

          {/* Delete Button — iOS style: destructive red, regular weight */}
          <button
            onClick={handleDeleteAccount}
            disabled={!isDeleteEnabled || isDeleting}
            className="w-full h-[44px] text-[17px] font-normal text-[#FF3B30] active:bg-[#E5E5EA] transition-colors disabled:text-[#FF3B30]/30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>{t("deleteAccount.deleting")}</span>
              </>
            ) : (
              <>
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
                >
                  delete
                </span>
                <span>{t("deleteAccount.confirmDelete")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
