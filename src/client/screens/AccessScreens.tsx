import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LockIcon, LogoMark, RefreshIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Field } from "../components/ui/forms/Field.js";
import { useLogIn } from "../lib/auth.js";

// Full-page on a phone, a card in the middle of the page on desktop.
const page =
  "flex min-h-dvh flex-col justify-center bg-background desktop:items-center desktop:px-5 desktop:py-12";
const card =
  "flex flex-col desktop:w-full desktop:rounded-[18px] desktop:bg-card desktop:shadow-[inset_0_0_0_1px_var(--color-border),0_12px_32px_rgba(31,42,68,0.08)]";

export function LoginScreen() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const logIn = useLogIn();
  const [empty, setEmpty] = useState(false);
  const problem = empty ? "empty" : (logIn.data ?? null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Not sent, so it never counts as a failed attempt.
    setEmpty(password === "");
    if (password === "") {
      logIn.reset();
      document.getElementById("login-password")?.focus();
    } else {
      logIn.mutate(password);
    }
  };

  return (
    <main className={page}>
      <form
        onSubmit={submit}
        className={`${card} gap-7 px-7 pb-10 desktop:max-w-[420px] desktop:px-9 desktop:py-10`}
      >
        <div className="flex flex-col items-center gap-2.5">
          <LogoMark width={120} />
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.5px]">
            Bowl <span className="text-wordmark-accent">&amp;</span> Belly
          </h1>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field
            id="login-password"
            type="password"
            autoComplete="current-password"
            label={t("login.password")}
            value={password}
            onChange={setPassword}
            error={problem ? t(`login.errors.${problem}`) : undefined}
          />
          <button type="submit" className={button.primaryLarge} disabled={logIn.isPending}>
            {t("login.submit")}
          </button>
        </div>
        <p className="text-center text-[13px] leading-[19px] text-muted-foreground">
          {t("login.forgotten")}
        </p>
      </form>
    </main>
  );
}

export function SessionExpiredScreen() {
  const { t } = useTranslation();

  return (
    <main className={page}>
      <section
        className={`${card} items-center gap-3.5 px-8 pb-[60px] text-center desktop:max-w-[460px] desktop:px-9 desktop:py-11`}
      >
        <span
          aria-hidden="true"
          className="flex size-[72px] items-center justify-center rounded-[18px] bg-accent-soft text-primary-strong"
        >
          <LockIcon size={34} />
        </span>
        <h1 className="mt-2 font-display text-[26px] font-semibold desktop:text-[28px]">
          {t("sessionExpired.title")}
        </h1>
        <p className="max-w-[300px] text-[15px] leading-[22px] text-muted-foreground desktop:max-w-[360px] desktop:text-base desktop:leading-6">
          <span className="desktop:hidden">{t("sessionExpired.bodyPhone")}</span>
          <span className="hidden desktop:inline">{t("sessionExpired.bodyDesktop")}</span>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${button.outline} mt-1.5 h-12 rounded-full px-6 desktop:border-0 desktop:bg-primary`}
        >
          <RefreshIcon size={18} />
          <span className="desktop:hidden">{t("sessionExpired.tryAgain")}</span>
          <span className="hidden desktop:inline">{t("sessionExpired.reload")}</span>
        </button>
      </section>
    </main>
  );
}
