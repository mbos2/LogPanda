"use client";

import { useState, type ChangeEvent, type JSX } from "react";
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
import { forgotPassword } from "@lib/auth/auth-service";
import { ApiErrorResponse } from "@lib/auth/types";

const getErrorMessage = (error: unknown): string => {
  const apiError: ApiErrorResponse | undefined = (
    error as {
      response?: { data?: ApiErrorResponse };
    }
  )?.response?.data;

  return apiError?.error?.message ?? "Failed to send reset email.";
};

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.target.value);

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

      await forgotPassword({
        email: email.trim(),
      });

      setSuccessMessage("Password reset email sent. Please check your inbox.");
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
              Forgot Password?
            </Box>
            <Box color="gray.500" textAlign="center">
              No worries, it happens. Enter your email address below and
              we&apos;ll send you a link to reset your password.
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
                    value={email}
                    onChange={handleChange}
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
              disabled={isSubmitting || email.trim().length === 0}
              loading={isSubmitting}
            >
              Send Reset Link
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
