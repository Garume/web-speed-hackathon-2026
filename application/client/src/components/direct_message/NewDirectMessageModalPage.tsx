import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { FormInputField } from "@web-speed-hackathon-2026/client/src/components/foundation/FormInputField";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";
import { NewDirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { validate } from "@web-speed-hackathon-2026/client/src/direct_message/validation";
import { FormTouched, hasFormErrors } from "@web-speed-hackathon-2026/client/src/utils/form";
import { closeDialog } from "@web-speed-hackathon-2026/client/src/utils/dialog";

interface Props {
  id: string;
  onSubmit: (values: NewDirectMessageFormData) => Promise<string | null>;
}

const INITIAL_VALUES: NewDirectMessageFormData = {
  username: "",
};

export const NewDirectMessageModalPage = ({ id, onSubmit }: Props) => {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState<FormTouched<NewDirectMessageFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errors = useMemo(() => validate(values), [values]);
  const invalid = hasFormErrors(errors);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSubmitError(null);
    setValues({
      username: event.target.value,
    });
  };

  const handleBlur = () => {
    setTouched((currentTouched) =>
      currentTouched.username ? currentTouched : { ...currentTouched, username: true },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      username: true,
    });
    setSubmitError(null);

    if (invalid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const error = await onSubmit(values);
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-y-6">
      <h2 className="text-center text-2xl font-bold">新しくDMを始める</h2>

      <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
        <FormInputField
          error={touched.username ? errors.username : undefined}
          label="ユーザー名"
          leftItem={<span className="text-cax-text-subtle leading-none">@</span>}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="username"
          value={values.username}
        />

        <div className="grid gap-y-2">
          <ModalSubmitButton disabled={isSubmitting || invalid} loading={isSubmitting}>
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
