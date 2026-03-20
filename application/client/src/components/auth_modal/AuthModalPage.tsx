import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { AuthFormData } from "@web-speed-hackathon-2026/client/src/auth/types";
import { validate } from "@web-speed-hackathon-2026/client/src/auth/validation";
import { FormInputField } from "@web-speed-hackathon-2026/client/src/components/foundation/FormInputField";
import { Link } from "@web-speed-hackathon-2026/client/src/components/foundation/Link";
import { ModalErrorMessage } from "@web-speed-hackathon-2026/client/src/components/modal/ModalErrorMessage";
import { ModalSubmitButton } from "@web-speed-hackathon-2026/client/src/components/modal/ModalSubmitButton";
import { FormTouched, hasFormErrors } from "@web-speed-hackathon-2026/client/src/utils/form";

interface Props {
  onRequestCloseModal: () => void;
  onSubmit: (values: AuthFormData) => Promise<string | null>;
}

const INITIAL_VALUES: AuthFormData = {
  type: "signin",
  username: "",
  name: "",
  password: "",
};

export const AuthModalPage = ({ onRequestCloseModal, onSubmit }: Props) => {
  const [values, setValues] = useState<AuthFormData>(INITIAL_VALUES);
  const [touched, setTouched] = useState<FormTouched<AuthFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errors = useMemo(() => validate(values), [values]);
  const invalid = hasFormErrors(errors);
  const type = values.type;

  const updateValue =
    (field: "username" | "name" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setSubmitError(null);
      setValues((currentValues) => ({
        ...currentValues,
        [field]: value,
      }));
    };

  const markTouched = (field: keyof AuthFormData) => () => {
    setTouched((currentTouched) =>
      currentTouched[field] ? currentTouched : { ...currentTouched, [field]: true },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      username: true,
      name: true,
      password: true,
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
    <form className="grid gap-y-6" onSubmit={handleSubmit}>
      <h2 className="text-center text-2xl font-bold">
        {type === "signin" ? "サインイン" : "新規登録"}
      </h2>

      <div className="flex justify-center">
        <button
          className="text-cax-brand underline"
          onClick={() => {
            setSubmitError(null);
            setTouched({});
            setValues((currentValues) => ({
              ...currentValues,
              type: currentValues.type === "signin" ? "signup" : "signin",
            }));
          }}
          type="button"
        >
          {type === "signin" ? "初めての方はこちら" : "サインインはこちら"}
        </button>
      </div>

      <div className="grid gap-y-2">
        <FormInputField
          autoComplete="username"
          error={touched.username ? errors.username : undefined}
          label="ユーザー名"
          leftItem={<span className="text-cax-text-subtle leading-none">@</span>}
          onBlur={markTouched("username")}
          onChange={updateValue("username")}
          value={values.username}
        />

        {type === "signup" && (
          <FormInputField
            autoComplete="nickname"
            error={touched.name ? errors.name : undefined}
            label="名前"
            onBlur={markTouched("name")}
            onChange={updateValue("name")}
            value={values.name}
          />
        )}

        <FormInputField
          autoComplete={type === "signup" ? "new-password" : "current-password"}
          error={touched.password ? errors.password : undefined}
          label="パスワード"
          onBlur={markTouched("password")}
          onChange={updateValue("password")}
          type="password"
          value={values.password}
        />
      </div>

      {type === "signup" ? (
        <p>
          <Link className="text-cax-brand underline" onClick={onRequestCloseModal} to="/terms">
            利用規約
          </Link>
          に同意して
        </p>
      ) : null}

      <ModalSubmitButton disabled={isSubmitting || invalid} loading={isSubmitting}>
        {type === "signin" ? "サインイン" : "登録する"}
      </ModalSubmitButton>

      <ModalErrorMessage>{submitError}</ModalErrorMessage>
    </form>
  );
};
