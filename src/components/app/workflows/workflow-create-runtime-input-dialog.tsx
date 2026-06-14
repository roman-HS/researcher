"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  workflowNumberRuntimeInputSchema,
  workflowTextRuntimeInputSchema,
  type WorkflowRuntimeInput,
} from "@/contracts/workflows/runtime-inputs";
import type { ConfigFieldValueType } from "@/lib/workflows/bindable-config-value";

/**
 * Dialog for creating a workflow runtime input from a tool inspector field.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

type WorkflowCreateRuntimeInputDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedKey: string;
  suggestedLabel: string;
  fieldType: ConfigFieldValueType;
  existingKeys: readonly string[];
  onCreate: (input: WorkflowRuntimeInput) => void;
};

type WorkflowCreateRuntimeInputFormProps = Omit<
  WorkflowCreateRuntimeInputDialogProps,
  "open" | "onOpenChange"
> & {
  onClose: () => void;
};

function WorkflowCreateRuntimeInputForm({
  suggestedKey,
  suggestedLabel,
  fieldType,
  existingKeys,
  onCreate,
  onClose,
}: WorkflowCreateRuntimeInputFormProps) {
  const [key, setKey] = useState(suggestedKey);
  const [label, setLabel] = useState(suggestedLabel);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmedKey = key.trim();
    const trimmedLabel = label.trim();

    if (existingKeys.includes(trimmedKey)) {
      setError(`Workflow input key "${trimmedKey}" already exists.`);
      return;
    }

    const parsed =
      fieldType === "number"
        ? workflowNumberRuntimeInputSchema.safeParse({
            key: trimmedKey,
            label: trimmedLabel,
            type: "number",
            required: true,
          })
        : workflowTextRuntimeInputSchema.safeParse({
            key: trimmedKey,
            label: trimmedLabel,
            type: "text",
            required: true,
          });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid workflow input.");
      return;
    }

    onCreate(parsed.data);
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create workflow input</DialogTitle>
        <DialogDescription>
          Runners will be prompted for this value when starting the workflow.
          Type: {fieldType}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="runtime-input-key">Key</Label>
          <Input
            id="runtime-input-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="zipCode"
            autoComplete="off"
          />
          <p className="text-[11px] text-muted-foreground">
            Used in bindings. Lowercase letter first, then letters and numbers.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="runtime-input-label">Label</Label>
          <Input
            id="runtime-input-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="ZIP code"
            autoComplete="off"
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <DialogFooter showCloseButton={false}>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Create input
        </Button>
      </DialogFooter>
    </>
  );
}

export function WorkflowCreateRuntimeInputDialog({
  open,
  onOpenChange,
  suggestedKey,
  suggestedLabel,
  fieldType,
  existingKeys,
  onCreate,
}: WorkflowCreateRuntimeInputDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <WorkflowCreateRuntimeInputForm
            key={`${suggestedKey}-${suggestedLabel}-${fieldType}`}
            suggestedKey={suggestedKey}
            suggestedLabel={suggestedLabel}
            fieldType={fieldType}
            existingKeys={existingKeys}
            onCreate={onCreate}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
