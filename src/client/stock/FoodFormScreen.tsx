import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { kcalPerKg } from "../../shared/stock.js";
import { button } from "../components/ui/forms/button.js";
import { Select } from "../components/ui/forms/Select.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { PhotoPicker } from "../components/PhotoPicker.js";
import { ConfirmDialog } from "../components/ui/overlays/ConfirmDialog.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import {
  foodTypeLabel,
  portionPlural,
  portionUnit,
  suggestedPortion,
  type SUGGESTED_PORTIONS,
  useFood,
  useFoodTypes,
  useSaveFood,
  useSetFoodArchived,
  type FoodBody,
  type FoodDetail,
  type KcalBackfill,
} from "./foods.js";
import { parseAmount, stockGramsOf, stockText } from "./foodForm.js";
import { formatInputNumber, parsePositive } from "../lib/format.js";
import { petTypeLabel, usePets, usePetTypes } from "../pets/pets.js";
import { useDemo } from "../lib/instance.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { offeredTypes, optionLabel } from "../settings/types.js";
import { useFormErrors, type CheckedField } from "../lib/useFormErrors.js";
import { KcalUpdateDialog } from "./KcalUpdateDialog.js";
import { PortionCard, type PortionValues } from "./PortionCard.js";
import { StockCard, type StockValues } from "./StockCard.js";

interface FormState extends PortionValues, StockValues {
  name: string;
  brand: string;
  photoId: number | null;
  foodTypeId: number | null;
  /** Null suits any pet; undefined is "not chosen yet", which takes the default. */
  petTypeId: number | null | undefined;
  kcal: string;
  per: "100g" | "kg";
}

type FieldName = "name" | "kcal" | "portionName" | "portionG" | "stock";
const FIELD_ORDER: FieldName[] = ["name", "kcal", "portionName", "portionG", "stock"];

function FoodForm({ food, today }: { food: FoodDetail | undefined; today: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: foodTypes } = useFoodTypes();
  const { data: petTypes } = usePetTypes();
  const demo = useDemo();
  const { pet: selectedPet } = useSelectedPet();
  const save = useSaveFood(food?.id);
  const archive = useSetFoodArchived("archive");
  const [archiving, setArchiving] = useState(false);
  const [askingBackfill, setAskingBackfill] = useState<FoodBody | null>(null);

  const suggestedName = (key: (typeof SUGGESTED_PORTIONS)[number]) => t(`portionName.${key}`);
  const [form, setForm] = useState<FormState>(() => {
    const known = food?.portionName ? suggestedPortion(food.portionName, i18n) : undefined;
    return {
      name: food?.name ?? "",
      brand: food?.brand ?? "",
      photoId: food?.photoId ?? null,
      foodTypeId: food?.foodTypeId ?? null,
      petTypeId: food ? food.petTypeId : undefined,
      kcal: food ? formatInputNumber(food.kcalPerKg / 10, i18n.language) : "",
      per: "100g",
      usePortion: food ? food.portionName !== null : false,
      portion: known ?? (food?.portionName ? "other" : "pouch"),
      otherPortion: known ? "" : (food?.portionName ?? ""),
      portionG: food?.portionG ? String(food.portionG) : "",
      countIn: food?.stockUnit ?? "portion",
      ...(food ? stockText(food, i18n.language) : { stock: "", stockIn: "g" }),
    };
  });
  const [stockTouched, setStockTouched] = useState(false);
  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const set = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateStock = (patch: Partial<StockValues>) => {
    setStockTouched(true);
    update(patch);
  };

  const foodTypeId = form.foodTypeId ?? foodTypes?.[0]?.id ?? null;
  const isDry = foodTypes?.find((type) => type.id === foodTypeId)?.systemKey === "dry";
  // A new food is for the selected pet's kind unless the user says otherwise.
  const petTypeId =
    form.petTypeId === undefined ? (selectedPet?.petTypeId ?? null) : form.petTypeId;

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
  const field = (name: FieldName): CheckedField => ({
    id: errors.idOf(name),
    error: errorFor(name),
    onBlur: errors.recheck(name),
  });

  const title = food ? t("foodForm.edit") : t("foodForm.add");
  const hasPortions = usePortion && portionName !== "";
  const portionsLabel = hasPortions ? portionPlural(portionName, i18n) : null;

  const send = (body: FoodBody, kcalBackfill: KcalBackfill) =>
    save.mutate(
      { body, keepStock: food !== undefined && !stockTouched, kcalBackfill },
      { onSuccess: () => void navigate("/stock") },
    );

  const submit = () => {
    if (errors.reject() || foodTypeId === null || kcalStored === null || stockAmount === null) {
      return;
    }
    const grams = usePortion && portionG !== null ? Math.round(portionG) : null;
    const stockG = stockGramsOf(stockAmount, form.stockIn, counted ? grams : null);
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
      stockG,
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
      <SubPageHeader
        title={title}
        phoneLink={{ to: "/stock", label: t("action.close"), close: true }}
        desktopLink={{ to: "/stock", label: t("nav.stock") }}
      />

      <ErrorSummary names={errors.shown.map((problem) => t(`foodForm.errorNames.${problem}`))} />

      <div className="grid flex-1 content-start gap-3.5 px-5 pt-1 pb-4 desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          <Card>
            <CardHeading title={t("foodForm.details")} />
            {!demo && (
              <PhotoPicker
                shape="wide"
                photoId={form.photoId}
                onChange={(photoId) => set("photoId", photoId)}
                label={t("foodForm.addPhoto")}
                alt={t("foodForm.photo")}
                hint={t("foodForm.photoHint")}
                changeLabel={t("foodForm.changePhoto")}
                removeLabel={t("foodForm.removePhoto")}
              />
            )}
            <Field
              label={t("foodForm.brand")}
              placeholder={t("foodForm.brandPlaceholder")}
              value={form.brand}
              onChange={(value) => set("brand", value)}
            />
            <Field
              {...field("name")}
              label={t("foodForm.name")}
              value={form.name}
              onChange={(value) => set("name", value)}
            />
            {foodTypes && foodTypeId !== null && (
              <Segmented
                label={t("foodForm.foodType")}
                value={String(foodTypeId)}
                onChange={(value) => set("foodTypeId", Number(value))}
                options={offeredTypes(foodTypes, food?.foodTypeId).map((type) => ({
                  value: String(type.id),
                  label: optionLabel(foodTypeLabel(type, t), type, t),
                }))}
              />
            )}
            <Select
              label={t("foodForm.for")}
              value={petTypeId ?? ""}
              onChange={(value) => set("petTypeId", value === "" ? null : Number(value))}
            >
              {offeredTypes(petTypes ?? [], food?.petTypeId).map((type) => (
                <option key={type.id} value={type.id}>
                  {optionLabel(petTypeLabel(type, t), type, t)}
                </option>
              ))}
              <option value="">{t("foodForm.anyPet")}</option>
            </Select>
          </Card>

          <Card>
            <CardHeading title={t("foodForm.calories")} hint={t("foodForm.caloriesHint")} />
            <div className="flex items-start gap-3">
              <Field
                {...field("kcal")}
                label={t("foodForm.energy")}
                inputMode="decimal"
                suffix={t("common.kcal")}
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
              {kcalStored ? t("foodForm.storedAs", { kcal: kcalStored }) : t("foodForm.asPrinted")}
            </span>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          {!isDry && (
            <PortionCard
              value={form}
              onChange={update}
              nameField={field("portionName")}
              weightField={field("portionG")}
            />
          )}
          <StockCard
            value={form}
            onChange={updateStock}
            portionsLabel={portionsLabel}
            portionUnit={hasPortions ? portionUnit(portionName, i18n) : null}
            counted={counted}
            editing={food !== undefined}
            field={field("stock")}
          />
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
          confirmLabel={t("foodForm.archiveConfirm")}
          onConfirm={() => archive.mutate(food.id, { onSuccess: () => void navigate("/stock") })}
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
