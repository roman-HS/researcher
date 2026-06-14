"use client";

import {
  type SubmitEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { createWorkflowRequestSchema } from "@/contracts/workflows/requests";
import {
  createWorkflowAction,
  type CreateWorkflowActionState,
} from "@/modules/workflows/actions";
import { formatWorkflowFieldErrors } from "@/modules/workflows/schemas";

const initialState: CreateWorkflowActionState = {};

type CreateWorkflowFormProps = {
  onCancel: () => void;
};

function CreateWorkflowForm({ onCancel }: CreateWorkflowFormProps) {
  const [state, formAction] = useActionState(
    createWorkflowAction,
    initialState,
  );
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Record<string, string>
  >({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = createWorkflowRequestSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      setClientFieldErrors(formatWorkflowFieldErrors(parsed.error));
      return;
    }

    setClientFieldErrors({});
    startTransition(() => {
      formAction(formData);
    });
  }

  const fieldErrors = {
    ...state.fieldErrors,
    ...clientFieldErrors,
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create workflow</DialogTitle>
        <DialogDescription>
          Give your workflow a name. You can add steps and inputs in the builder.
        </DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="workflow-name">Name</Label>
          <Input
            id="workflow-name"
            name="name"
            autoComplete="off"
            placeholder="e.g. ZIP area snapshot"
            required
            aria-invalid={Boolean(fieldErrors.name)}
            disabled={isPending}
          />
          {fieldErrors.name ? (
            <p className="text-sm text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="workflow-description">
            Description{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="workflow-description"
            name="description"
            placeholder="What does this workflow analyze?"
            rows={3}
            aria-invalid={Boolean(fieldErrors.description)}
            disabled={isPending}
          />
          {fieldErrors.description ? (
            <p className="text-sm text-destructive">{fieldErrors.description}</p>
          ) : null}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create workflow"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

type CreateWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateWorkflowDialog({
  open,
  onOpenChange,
}: CreateWorkflowDialogProps) {
  const [formInstance, setFormInstance] = useState(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setFormInstance((current) => current + 1);
    }

    wasOpenRef.current = open;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CreateWorkflowForm
          key={formInstance}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}
