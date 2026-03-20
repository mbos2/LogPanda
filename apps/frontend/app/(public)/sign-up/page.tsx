"use client";

import { useMemo, useState, type ChangeEvent, type JSX } from "react";
import {
  Box,
  Grid,
  GridItem,
  Icon,
  Button,
  Field,
  Fieldset,
  Input,
  Link,
  Text,
} from "@chakra-ui/react";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { SiFoodpanda } from "react-icons/si";
import { signUp } from "@lib/auth/auth-service";
import { ApiErrorResponse } from "@lib/auth/types";
import { useRouter } from "next/navigation";

interface SignUpFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to create account.";
};

const splitFullName = (
  fullName: string,
): { firstName: string; lastName: string } | null => {
  const parts: string[] = fullName
    .trim()
    .split(/\s+/)
    .filter((value: string): boolean => value.length > 0);

  if (parts.length < 2) {
    return null;
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export default function SignUpPage(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<SignUpFormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isDisabled: boolean = useMemo((): boolean => {
    return (
      isSubmitting ||
      form.fullName.trim().length === 0 ||
      form.email.trim().length === 0 ||
      form.password.trim().length === 0 ||
      form.confirmPassword.trim().length === 0
    );
  }, [form, isSubmitting]);

  const handleChange =
    (field: keyof SignUpFormState) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setForm((prev: SignUpFormState): SignUpFormState => {
        return {
          ...prev,
          [field]: event.target.value,
        };
      });

      if (errorMessage) {
        setErrorMessage("");
      }

      if (successMessage) {
        setSuccessMessage("");
      }
    };

  const handleSubmit = async (): Promise<void> => {
    setErrorMessage("");
    setSuccessMessage("");

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const nameParts: { firstName: string; lastName: string } | null =
      splitFullName(form.fullName);

    if (!nameParts) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    try {
      setIsSubmitting(true);

      await signUp({
        email: form.email.trim(),
        password: form.password,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
      });

      router.replace(
        `/confirm-sign-up?email=${encodeURIComponent(form.email.trim())}`,
      );
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      w={{ base: "100%", md: "450px" }}
      maxW="100%"
      boxShadow={{ base: "none", md: "0px 6px 19px -8px" }}
      boxShadowColor="gray.100"
      borderRadius={8}
      px={{ base: 0, md: 4 }}
      py={12}
    >
      <Box width="100%" px={8}>
        <Grid templateRows="auto auto auto auto" gap="16px">
          <GridItem display="grid" py={4} justifyContent="center">
            <Box fontSize="2xl" fontWeight="bold" color="#4b6f44">
              <Icon size="xl" color="#4b6f44">
                <SiFoodpanda />
              </Icon>{" "}
              Join Log Panda
            </Box>
          </GridItem>

          <GridItem display="grid" gap={2}>
            <Box color="gray.500" textAlign="center">
              Start tracking your logs efficiently
            </Box>
          </GridItem>

          <GridItem>
            <Fieldset.Root>
              <Fieldset.Content>
                <Field.Root>
                  <Field.Label>Full Name</Field.Label>
                  <Input
                    name="full-name"
                    placeholder="👤 Enter your full name"
                    value={form.fullName}
                    onChange={handleChange("fullName")}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Email Address</Field.Label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="🖂 name@company.com"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Password</Field.Label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="🔒︎ ••••••••••"
                    value={form.password}
                    onChange={handleChange("password")}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Confirm Password</Field.Label>
                  <Input
                    name="confirm-password"
                    type="password"
                    placeholder="ꗃ ••••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                  />
                </Field.Root>
              </Fieldset.Content>
            </Fieldset.Root>
          </GridItem>

          {(errorMessage || successMessage) && (
            <GridItem>
              {errorMessage ? (
                <Text color="red.500" textAlign="center">
                  {errorMessage}
                </Text>
              ) : null}

              {successMessage ? (
                <Text color="#4b6f44" textAlign="center">
                  {successMessage}
                </Text>
              ) : null}
            </GridItem>
          )}

          <GridItem mt={4}>
            <Button
              w="full"
              type="button"
              alignSelf="flex-start"
              size="xl"
              bg="#4b6f44"
              color="white"
              onClick={(): void => {
                void handleSubmit();
              }}
              disabled={isDisabled}
              loading={isSubmitting}
            >
              Create Account{" "}
              <Icon size="lg">
                <IoIosArrowDroprightCircle />
              </Icon>
            </Button>
          </GridItem>

          <GridItem
            display={{ sm: "block", md: "flex" }}
            gap={2}
            justifyContent="center"
          >
            <Box>Already have account?</Box>
            <Link fontWeight="bold" color="#4b6f44" href="/sign-in">
              Sign In
            </Link>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
