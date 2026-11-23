import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { kcalPerKg } from "../../shared/stock.js";
import { BackIcon, CameraIcon, ChevronDownIcon, CloseIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { Card, CardHeading } from "../components/ui/Card.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { ErrorSummary } from "../components/ui/ErrorSummary.js";
import { Field, inputClass } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Switch } from "../components/ui/Switch.js";
import {
  foodTypeLabel,
  portionPlural,
  useFood,
  useFoodTypes,
  useSaveFood,
  useSetFoodArchived,
  type FoodBody,
  type FoodDetail,
  type KcalBackfill,
} from "../lib/foods.js";
import { parsePositive, petTypeLabel } from "../lib/format.js";
import { uploadPhoto, usePets, usePetTypes } from "../lib/pets.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { KcalUpdateDialog } from "./KcalUpdateDialog.js";

const SUGGESTED = ["pouch", "tin", "tray"] as const;
type PortionChoice = (typeof SUGGESTED)[number] | "other";

interface FormState {
  name: string;
  brand: string;
  photoId: number | null;
  foodTypeId: number | null;
  /** Null suits any pet; undefined is "not chosen yet", which takes the default. */
  petTypeId: number | null | undefined;
  kcal: string;
  per: "100g" | "kg";
  usePortion: boolean;
  portion: PortionChoice;
  otherPortion: string;
  portionG: string;
  countIn: "g" | "portion";
  stock: string;
  stockIn: "g" | "kg";
}

type FieldName = "name" | "kcal" | "portionName" | "portionG" | "stock";
const FIELD_ORDER: FieldName[] = ["name", "kcal", "portionName", "portionG", "stock"];

const plain = (value: number) => String(Math.round(value * 100) / 100);

/** A non-negative number from "12" or "1,4"; null when it is something else. */
function parseAmount(text: string): number | null {
  if (text.trim() === "") {
    return 0;
  }
  const value = Number(text.trim().replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function FoodForm({ food, today }: { food: FoodDetail | undefined; today: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: foodTypes } = useFoodTypes();
  const { data: petTypes } = usePetTypes();
  const { data: pets } = usePets();
  const save = useSaveFood(food?.id);
  const archive = useSetFoodArchived("archive");
  const fileInput = useRef<HTMLInputElement>(null);
  const [archiving, setArchiving] = useState(false);
  const [askingBackfill, setAskingBackfill] = useState<FoodBody | null>(null);

  const suggestedName = (key: (typeof SUGGESTED)[number]) => t(`portionName.${key}`);
  const [form, setForm] = useState<FormState>(() => {
    const known = SUGGESTED.find(
      (key) => suggestedName(key).toLowerCase() === food?.portionName?.toLowerCase(),
    );
    const counted = food?.stockUnit === "portion" && food.portionG !== null;
    const stockG = Math.max(food?.stockG ?? 0, 0);
    return {
      name: food?.name ?? "",
      brand: food?.brand ?? "",
      photoId: food?.photoId ?? null,
      foodTypeId: food?.foodTypeId ?? null,
      petTypeId: food ? food.petTypeId : undefined,
      kcal: food ? plain(food.kcalPerKg / 10) : "",
      per: "100g",
      usePortion: food ? food.portionName !== null : false,
      portion: known ?? (food?.portionName ? "other" : "pouch"),
      otherPortion: known ? "" : (food?.portionName ?? ""),
      portionG: food?.portionG ? String(food.portionG) : "",
      countIn: food?.stockUnit ?? "portion",
      stock:
        food === undefined
          ? ""
          : plain(
              counted && food.portionG
                ? stockG / food.portionG
                : stockG >= 1000
                  ? stockG / 1000
                  : stockG,
            ),
      stockIn: stockG >= 1000 ? "kg" : "g",
    };
  });
  const [stockTouched, setStockTouched] = useState(false);
  const set = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setStock = <Key extends "stock" | "stockIn" | "countIn">(
    key: Key,
    value: FormState[Key],
  ) => {
    setStockTouched(true);
    set(key, value);
  };

  const foodTypeId = form.foodTypeId ?? foodTypes?.[0]?.id ?? null;
  const isDry = foodTypes?.find((type) => type.id === foodTypeId)?.systemKey === "dry";
  // A new food is for the user's own kind of pet unless they say otherwise.
  const petTypeId =
    form.petTypeId === undefined ? (pets?.pets[0]?.petTypeId ?? null) : form.petTypeId;

  const kcal = parsePositive(form.kcal);
  const kcalStored = kcal === null ? null : kcalPerKg(kcal, form.per);
  const usePortion = form.usePortion && !isDry;
  const portionName =
    form.portion === "other" ? form.otherPortion.trim() : suggestedName(form.portion);
  const portionG = parsePositive(form.portionG);
  const counted = usePortion && form.countIn === "portion";
  const stockAmount = parseAmount(form.stock);

  const problems = new Map<FieldName, FieldName>();
  if (form.name.trim() === "") {
    problems.set("name", "name");
  }
  if (kcalStored === null || kcalStored === 0) {
    problems.set("kcal", "kcal");
  }
  if (usePortion && portionName === "") {
    problems.set("portionName", "portionName");
  }
  if (usePortion && (portionG === null || Math.round(portionG) === 0)) {
    problems.set("portionG", "portionG");
  }
  if (stockAmount === null) {
    problems.set("stock", "stock");
  }
  const errors = useFormErrors(problems, FIELD_ORDER, "food");
  const errorFor = (field: FieldName) => {
    const problem = errors.problemOf(field);
    return problem && t(`foodForm.errors.${problem}`);
  };
  const { recheck } = errors;

  const title = food ? t("foodForm.edit") : t("foodForm.add");
  const units = usePortion && portionName ? portionPlural(portionName, i18n) : null;

  const send = (body: FoodBody, kcalBackfill: KcalBackfill) =>
    save.mutate({ body, kcalBackfill }, { onSuccess: () => navigate("/stock") });

  const submit = () => {
    if (errors.reject() || foodTypeId === null || kcalStored === null || stockAmount === null) {
      return;
    }
    const grams = usePortion && portionG !== null ? Math.round(portionG) : null;
    let stockG = Math.round(stockAmount * (form.stockIn === "kg" ? 1000 : 1));
    if (counted && grams !== null) {
      stockG = Math.round(stockAmount * grams);
    }
    const body: FoodBody = {
      name: form.name,
      brand: form.brand.trim() || null,
      photoId: form.photoId,
      foodTypeId,
      petTypeId,
      kcalPerKg: kcalStored,
      portionName: usePortion ? portionName : null,
      portionG: grams,
      stockUnit: counted ? "portion" : "g",
      // An untouched figure is sent back as it was, free of rounding.
      stockG: food && !stockTouched ? food.stockG : stockG,
    };
    if (food?.hasFeeds && food.kcalPerKg !== kcalStored) {
      setAskingBackfill(body);
    } else {
      send(body, { scope: "none" });
    }
  };

  const saveButton = (className: string) => (
    <button type="button" className={className} disabled={save.isPending} onClick={submit}>
      {food ? t("foodForm.saveChanges") : t("foodForm.save")}
    </button>
  );
  const archiveButton = food && (
    <button
      type="button"
      className={`${button.dangerGhost} self-center desktop:self-auto`}
      onClick={() => setArchiving(true)}
    >
      {t("foodForm.archive")}
    </button>
  );
  const perUnit = (per: "100g" | "kg") => t(per === "100g" ? "foodForm.per100" : "foodForm.perKg");
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });

  return (
    <div className="flex min-h-dvh flex-col desktop:min-h-0 desktop:gap-6">
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to="/stock" aria-label={t("action.close")} className={button.icon}>
          <CloseIcon />
        </Link>
        <h1 className="font-display text-title font-semibold">{title}</h1>
      </header>
      <header className="hidden flex-col gap-1 desktop:flex">
        <Link to="/stock" className="inline-flex items-center gap-1 text-sm font-semibold">
          <BackIcon size={16} />
          {t("nav.stock")}
        </Link>
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {title}
        </h1>
      </header>

      <ErrorSummary names={errors.shown.map((problem) => t(`foodForm.errorNames.${problem}`))} />

      <div className="grid flex-1 content-start gap-3.5 px-5 pt-1 pb-4 desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          <Card>
            <CardHeading title={t("foodForm.details")} />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const photo = event.target.files?.[0];
                if (photo) {
                  void uploadPhoto(photo).then((id) => set("photoId", id));
                }
              }}
            />
            {form.photoId === null ? (
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex size-[88px] flex-none cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#B9BFCB] bg-background text-[13px] font-medium text-muted-foreground"
                >
                  <CameraIcon />
                  {t("foodForm.addPhoto")}
                </button>
                <span className="text-[13px] text-muted-foreground">{t("foodForm.photoHint")}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <img
                  src={`/api/images/${form.photoId}`}
                  alt={t("foodForm.photo")}
                  className="h-[180px] w-full rounded-xl object-cover"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={button.outline}
                    onClick={() => fileInput.current?.click()}
                  >
                    {t("foodForm.changePhoto")}
                  </button>
                  <button
                    type="button"
                    className={button.dangerGhost}
                    onClick={() => set("photoId", null)}
                  >
                    {t("foodForm.removePhoto")}
                  </button>
                </div>
              </div>
            )}
            <Field
              label={t("foodForm.brand")}
              placeholder={t("foodForm.brandPlaceholder")}
              value={form.brand}
              onChange={(value) => set("brand", value)}
            />
            <Field
              id="food-name"
              label={t("foodForm.name")}
              error={errorFor("name")}
              onBlur={recheck("name")}
              value={form.name}
              onChange={(value) => set("name", value)}
            />
            {foodTypes && foodTypeId !== null && (
              <Segmented
                label={t("foodForm.foodType")}
                value={String(foodTypeId)}
                onChange={(value) => set("foodTypeId", Number(value))}
                options={foodTypes.map((type) => ({
                  value: String(type.id),
                  label: foodTypeLabel(type, t),
                }))}
              />
            )}
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("foodForm.for")}
              <span className="relative font-normal">
                <select
                  value={petTypeId ?? ""}
                  onChange={(event) =>
                    set("petTypeId", event.target.value === "" ? null : Number(event.target.value))
                  }
                  className={`${inputClass} appearance-none pr-11`}
                >
                  {petTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {petTypeLabel(type, t)}
                    </option>
                  ))}
                  <option value="">{t("foodForm.anyPet")}</option>
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 right-3.5 text-muted-foreground"
                >
                  <ChevronDownIcon size={20} />
                </span>
              </span>
            </label>
          </Card>

          <Card>
            <CardHeading title={t("foodForm.calories")} hint={t("foodForm.caloriesHint")} />
            <div className="flex items-start gap-3">
              <Field
                id="food-kcal"
                label={t("foodForm.energy")}
                inputMode="decimal"
                suffix="kcal"
                error={errorFor("kcal")}
                onBlur={recheck("kcal")}
                value={form.kcal}
                onChange={(value) => set("kcal", value)}
              />
              <div className="flex-none">
                <Segmented
                  label={t("foodForm.per")}
                  value={form.per}
                  onChange={(value) => set("per", value)}
                  options={[
                    { value: "100g", label: perUnit("100g") },
                    { value: "kg", label: perUnit("kg") },
                  ]}
                />
              </div>
            </div>
            <span className="text-[13px] text-muted-foreground">
              {kcalStored
                ? t("foodForm.storedAs", { kcal: number.format(kcalStored) })
                : t("foodForm.asPrinted")}
            </span>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          {!isDry && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <CardHeading title={t("foodForm.portion")} hint={t("foodForm.portionHint")} />
                </div>
                <Switch
                  label={t("foodForm.usePortion")}
                  checked={form.usePortion}
                  onCheckedChange={(checked) => set("usePortion", checked)}
                />
              </div>
              {form.usePortion && (
                <>
                  <div className="flex flex-col gap-2">
                    <span id="food-portion-label" className="text-sm font-semibold">
                      {t("foodForm.portionName")}
                    </span>
                    <div
                      role="group"
                      aria-labelledby="food-portion-label"
                      className="flex flex-wrap gap-2"
                    >
                      {([...SUGGESTED, "other"] as const).map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          aria-pressed={form.portion === choice}
                          onClick={() => set("portion", choice)}
                          className="h-9 cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-medium aria-pressed:border-primary-strong aria-pressed:bg-accent-soft aria-pressed:font-semibold"
                        >
                          {t(`portionName.${choice}`)}
                        </button>
                      ))}
                    </div>
                    {form.portion === "other" && (
                      <>
                        <label htmlFor="food-portionName" className="sr-only">
                          {t("foodForm.otherName")}
                        </label>
                        <input
                          id="food-portionName"
                          placeholder={t("foodForm.otherPlaceholder")}
                          value={form.otherPortion}
                          onChange={(event) => set("otherPortion", event.target.value)}
                          onBlur={recheck("portionName")}
                          aria-invalid={errorFor("portionName") ? true : undefined}
                          aria-describedby={
                            errorFor("portionName") ? "food-portionName-error" : undefined
                          }
                          className={inputClass}
                        />
                        {errorFor("portionName") && (
                          <span
                            id="food-portionName-error"
                            className="text-[13px] font-medium text-danger"
                          >
                            {errorFor("portionName")}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-[140px]">
                    <Field
                      id="food-portionG"
                      label={t("foodForm.weight")}
                      inputMode="numeric"
                      suffix="g"
                      error={errorFor("portionG")}
                      onBlur={recheck("portionG")}
                      value={form.portionG}
                      onChange={(value) => set("portionG", value)}
                    />
                  </div>
                </>
              )}
            </Card>
          )}

          <Card>
            <CardHeading title={t("foodForm.stock")} hint={t("foodForm.stockHint")} />
            {units && (
              <Segmented
                label={t("foodForm.countIn")}
                value={form.countIn}
                onChange={(value) => setStock("countIn", value)}
                options={[
                  { value: "g", label: t("foodForm.grams") },
                  { value: "portion", label: units },
                ]}
              />
            )}
            <div className="flex items-end gap-3">
              <Field
                id="food-stock"
                label={t("foodForm.current")}
                inputMode="decimal"
                suffix={counted && units ? units.toLowerCase() : undefined}
                error={errorFor("stock")}
                onBlur={recheck("stock")}
                value={form.stock}
                onChange={(value) => setStock("stock", value)}
              />
              {!counted && (
                <div className="flex-none">
                  <Segmented
                    label={t("stock.unit")}
                    hideLabel
                    value={form.stockIn}
                    onChange={(value) => setStock("stockIn", value)}
                    options={[
                      { value: "g", label: "g" },
                      { value: "kg", label: "kg" },
                    ]}
                  />
                </div>
              )}
            </div>
          </Card>
          <div className="flex justify-center desktop:hidden">{archiveButton}</div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] desktop:hidden">
        {saveButton(button.primaryLarge)}
      </div>
      <div className="hidden items-center justify-end gap-2.5 desktop:flex">
        <span className="mr-auto">{archiveButton}</span>
        <Link to="/stock" className={button.outline}>
          {t("action.cancel")}
        </Link>
        {saveButton(button.primary)}
      </div>

      {food && (
        <ConfirmDialog
          open={archiving}
          onOpenChange={setArchiving}
          title={t("foodForm.archiveTitle", { name: food.name })}
          description={t("foodForm.archiveBody")}
          confirmLabel={t("pets.archiveConfirm")}
          onConfirm={() => archive.mutate(food.id, { onSuccess: () => navigate("/stock") })}
        />
      )}
      {food && askingBackfill && kcal !== null && (
        <KcalUpdateDialog
          today={today}
          description={t("kcalUpdate.body", {
            name: food.name,
            from: number.format(form.per === "100g" ? food.kcalPerKg / 10 : food.kcalPerKg),
            to: number.format(kcal),
            unit: perUnit(form.per),
          })}
          onSave={(kcalBackfill) => send(askingBackfill, kcalBackfill)}
          onCancel={() => setAskingBackfill(null)}
        />
      )}
    </div>
  );
}

export function FoodFormScreen() {
  const params = useParams();
  const foodId = params.foodId === undefined ? undefined : Number(params.foodId);
  const { data: pets } = usePets();
  const { data: food } = useFood(foodId);

  // The form copies the food into its own state once, so it waits for it.
  if (!pets || (foodId !== undefined && !food)) {
    return null;
  }
  return <FoodForm key={foodId} food={food} today={pets.today} />;
}
