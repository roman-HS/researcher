"use client";

import { type SubmitEvent, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createRunResponseSchema } from "@/contracts/runs/responses";
import type {
  WorkflowRuntimeInput,
  WorkflowRuntimeInputs,
} from "@/contracts/workflows/runtime-inputs";
import {
  apiClientPost,
  mapApiValidationIssuesToFieldErrors,
} from "@/lib/api/browser-client";
import {
  buildRuntimeInputFormState,
  normalizeRuntimeInputFormValues,
} from "@/lib/workflows/normalize-runtime-input-form-values";
import { validateRuntimeInputValues } from "@/lib/workflows/validate-runtime-inputs";

/**
 * @see Story 8.1.1 — Build workflow run form
 */

type WorkflowRunFormProps = {
  workflowId: string;
  workflowName: string;
  runtimeInputs: WorkflowRuntimeInputs;
};

type WorkflowRunFormFieldProps = {
  input: WorkflowRuntimeInput;
  value: unknown;
  error?: string;
  disabled: boolean;
  onChange: (key: string, value: unknown) => void;
};

function WorkflowRunFormField({
  input,
  value,
  error,
  disabled,
  onChange,
}: WorkflowRunFormFieldProps) {
  const fieldId = `run-input-${input.key}`;

  switch (input.type) {
    case "text":
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>
            {input.label}
            {input.required ? null : (
              <span className="font-normal text-muted-foreground">
                {" "}
                (optional)
              </span>
            )}
          </Label>
          <Input
            id={fieldId}
            name={input.key}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(input.key, event.target.value)}
            aria-invalid={Boolean(error)}
            disabled={disabled}
            autoComplete="off"
          />
          {input.helperText ? (
            <p className="text-sm text-muted-foreground">{input.helperText}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      );
    case "number":
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>
            {input.label}
            {input.required ? null : (
              <span className="font-normal text-muted-foreground">
                {" "}
                (optional)
              </span>
            )}
          </Label>
          <Input
            id={fieldId}
            name={input.key}
            type="number"
            value={
              value === undefined || value === null
                ? ""
                : typeof value === "number"
                  ? String(value)
                  : String(value)
            }
            onChange={(event) => onChange(input.key, event.target.value)}
            aria-invalid={Boolean(error)}
            disabled={disabled}
          />
          {input.helperText ? (
            <p className="text-sm text-muted-foreground">{input.helperText}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      );
    case "boolean":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3">
            <div className="space-y-1">
              <Label htmlFor={fieldId} className="cursor-pointer">
                {input.label}
                {input.required ? null : (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (optional)
                  </span>
                )}
              </Label>
              {input.helperText ? (
                <p className="text-sm text-muted-foreground">
                  {input.helperText}
                </p>
              ) : null}
            </div>
            <Switch
              id={fieldId}
              checked={value === true}
              onCheckedChange={(checked) => onChange(input.key, checked)}
              disabled={disabled}
              aria-invalid={Boolean(error)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      );
    case "select":
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>
            {input.label}
            {input.required ? null : (
              <span className="font-normal text-muted-foreground">
                {" "}
                (optional)
              </span>
            )}
          </Label>
          <Select
            value={typeof value === "string" ? value : undefined}
            onValueChange={(nextValue) => onChange(input.key, nextValue)}
            disabled={disabled}
          >
            <SelectTrigger id={fieldId} aria-invalid={Boolean(error)}>
              <SelectValue
                placeholder={`Select ${input.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {input.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {input.helperText ? (
            <p className="text-sm text-muted-foreground">{input.helperText}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      );
  }
}

export function WorkflowRunForm({
  workflowId,
  workflowName,
  runtimeInputs,
}: WorkflowRunFormProps) {
  const router = useRouter();
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const [formValues, setFormValues] = useState(() =>
    buildRuntimeInputFormState(runtimeInputs)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFieldChange(key: string, value: unknown) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const normalized = normalizeRuntimeInputFormValues(
      runtimeInputs,
      formValues
    );
    const validation = validateRuntimeInputValues(runtimeInputs, normalized);

    if (!validation.valid) {
      const nextFieldErrors: Record<string, string> = {};

      for (const issue of validation.issues) {
        if (!(issue.key in nextFieldErrors)) {
          nextFieldErrors[issue.key] = issue.message;
        }
      }

      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await apiClientPost(
        "/api/v1/runs",
        {
          workflowId,
          inputs: validation.values,
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKeyRef.current,
          },
          schema: createRunResponseSchema,
        }
      );

      if (!result.ok) {
        if (result.error.code === "validation_error") {
          setFieldErrors(
            mapApiValidationIssuesToFieldErrors(result.error.details)
          );
        }

        setFormError(result.error.message);
        return;
      }

      router.push(`/runs/${result.data.runId}`);
    });
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {runtimeInputs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This workflow has no runtime inputs. Starting a run will execute the
          published version as-is.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {runtimeInputs.map((input) => (
            <WorkflowRunFormField
              key={input.key}
              input={input}
              value={formValues[input.key]}
              error={fieldErrors[input.key]}
              disabled={isPending}
              onChange={handleFieldChange}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Starting run…" : `Run ${workflowName}`}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} asChild>
          <Link href={`/workflows/${workflowId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
