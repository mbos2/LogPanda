"use client";

import { useState, type ChangeEvent, type JSX } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { SiFoodpanda } from "react-icons/si";
import { confirmForgotPassword } from "@lib/auth/auth-service";
import { ApiErrorResponse } from "@lib/auth/types";

interface PasswordResetFormState {
  password: string;
  confirmPassword: string;
}

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to reset password.";
};

export default function PasswordResetPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email: string | null = searchParams.get("email");
  const code: string | null = searchParams.get("code");

  const [form, setForm] = useState<PasswordResetFormState>({
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleChange =
    (field: keyof PasswordResetFormState) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setForm((prev: PasswordResetFormState): PasswordResetFormState => {
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
    if (!email || !code) {
      setErrorMessage("Invalid password reset link.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await confirmForgotPassword({
        email,
        code,
        newPassword: form.password,
      });

      setSuccessMessage("Password reset successfully.");

      setTimeout((): void => {
        router.replace("/sign-in");
      }, 1200);
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
      <Box width="100%" px={{ base: 0, md: 4 }}>
        <Grid templateRows="auto auto auto auto" gap="16px">
          <GridItem display="grid" py={4} justifyContent="center">
            <Box fontSize="2xl" fontWeight="bold" color="#4b6f44">
              <Icon size="xl" color="#4b6f44">
                <SiFoodpanda />
              </Icon>{" "}
            </Box>
          </GridItem>

          <GridItem display="grid" gap={2}>
            <Box textAlign="center" fontSize="xl">
              Reset your password
            </Box>
          </GridItem>

          <GridItem>
            <Fieldset.Root>
              <Fieldset.Content>
                <Field.Root>
                  <Field.Label>New Password</Field.Label>
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

          {!email || !code ? (
            <GridItem>
              <Text color="red.500" textAlign="center">
                Invalid or incomplete password reset link.
              </Text>
            </GridItem>
          ) : null}

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

          <GridItem mt={2}>
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
              disabled={
                isSubmitting ||
                !email ||
                !code ||
                form.password.trim().length === 0 ||
                form.confirmPassword.trim().length === 0
              }
              loading={isSubmitting}
            >
              Reset Password
            </Button>
          </GridItem>

          <GridItem textAlign="center" mt={8}>
            <Link color="#4b6f44" href="/sign-in">
              <Icon size="lg">
                <FaRegArrowAltCircleLeft />
              </Icon>{" "}
              Back to Login
            </Link>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
}
