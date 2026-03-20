import { FormEvent, useRef, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { FormInputField } from "@web-speed-hackathon-2026/client/src/components/foundation/FormInputField";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";
import { NewDirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { validate } from "@web-speed-hackathon-2026/client/src/direct_message/validation";
import { closeDialog } from "@web-speed-hackathon-2026/client/src/utils/dialog";

interface Props {
  id: string;
  onUsernameBlur?: (username: string) => void;
  onSubmit: (values: NewDirectMessageFormData) => Promise<void>;
}

export const NewDirectMessageModalPage = ({ id, onSubmit, onUsernameBlur }: Props) => {
  const [username, setUsername] = useState("");
  const usernameRef = useRef("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const currentUsername = usernameRef.current;
    const validationErrors = validate({ username: currentUsername });
    if (validationErrors.username) {
      setFieldError(validationErrors.username);
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ username: currentUsername });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const hasErrors = !!validate({ username }).username;

  return (
    <div className="grid gap-y-6">
      <h2 className="text-center text-2xl font-bold">新しくDMを始める</h2>

      <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
        <FormInputField
          name="username"
          label="ユーザー名"
          placeholder="username"
          leftItem={<span className="text-cax-text-subtle leading-none">@</span>}
          value={username}
          onChange={(e) => {
            usernameRef.current = e.target.value;
            setUsername(e.target.value);
            if (touched) {
              const errors = validate({ username: e.target.value });
              setFieldError(errors.username);
            }
          }}
          onBlur={() => {
            setTouched(true);
            onUsernameBlur?.(usernameRef.current);
          }}
          error={touched ? fieldError : undefined}
        />

        <div className="grid gap-y-2">
          <ModalSubmitButton disabled={submitting || hasErrors} loading={submitting}>
            DMを開始
          </ModalSubmitButton>
          <Button onClick={() => closeDialog(id)} variant="secondary">
            キャンセル
          </Button>
        </div>

        <ModalErrorMessage>{submitError}</ModalErrorMessage>
      </form>
    </div>
  );
};
