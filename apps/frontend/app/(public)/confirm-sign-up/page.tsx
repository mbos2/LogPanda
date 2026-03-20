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
import { confirmSignUp } from "@lib/auth/auth-service";
import { ApiErrorResponse } from "@lib/auth/types";

interface ConfirmSignUpFormState {
  email: string;
  code: string;
}

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to confirm your account.";
};

export default function ConfirmSignUpPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<ConfirmSignUpFormState>({
    email: searchParams.get("email") ?? "",
    code: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleChange =
    (field: keyof ConfirmSignUpFormState) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setForm(
        (prev: ConfirmSignUpFormState): ConfirmSignUpFormState => ({
          ...prev,
          [field]: event.target.value,
        }),
      );

      if (errorMessage) {
        setErrorMessage("");
      }

      if (successMessage) {
        setSuccessMessage("");
      }
    };

  const handleSubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await confirmSignUp({
        email: form.email.trim(),
        code: form.code.trim(),
      });

      setSuccessMessage("Your account has been successfully confirmed.");

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
              Confirm your account
            </Box>
            <Box color="gray.500" textAlign="center">
              Enter the verification code we sent to your email.
            </Box>
          </GridItem>

          <GridItem>
            <Fieldset.Root>
              <Fieldset.Content>
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
                  <Field.Label>Verification Code</Field.Label>
                  <Input
                    name="code"
                    type="text"
                    placeholder="Enter verification code"
                    value={form.code}
                    onChange={handleChange("code")}
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
                form.email.trim().length === 0 ||
                form.code.trim().length === 0
              }
              loading={isSubmitting}
            >
              Confirm Account
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
