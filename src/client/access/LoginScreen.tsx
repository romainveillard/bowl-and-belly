import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LogoMark } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Field } from "../components/ui/forms/Field.js";
import { useLogIn } from "./auth.js";
import { accessCard, accessPage } from "./layout.js";

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
    <main className={accessPage}>
      <form
        onSubmit={submit}
        className={`${accessCard} gap-7 px-7 pb-10 desktop:max-w-[420px] desktop:px-9 desktop:py-10`}
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
