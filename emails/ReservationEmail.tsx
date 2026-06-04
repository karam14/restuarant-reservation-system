import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

type EmailProps = {
  guestName: string;
  reservationTime: string;
  status: string;
  emailAddress: string;
  isConfirmation?: boolean;
  restaurantName?: string;
  logoUrl?: string;
  brandColor?: string;
};

const DEFAULT_RESTAURANT_NAME = "Athenes Olijf";
const DEFAULT_LOGO_URL = "https://athenesolijf.nl/wp-content/uploads/2024/09/logo.png";
const DEFAULT_BRAND_COLOR = "#4CAF50";

export const ReservationEmail: React.FC<EmailProps> = ({
  guestName,
  reservationTime,
  status,
  emailAddress,
  isConfirmation = false,
  restaurantName = DEFAULT_RESTAURANT_NAME,
  logoUrl = DEFAULT_LOGO_URL,
  brandColor = DEFAULT_BRAND_COLOR,
}) => {
  const isCancelled = status === "geannuleerd";
  const isPending = status === "in afwachting";
  const statusColor = isCancelled ? "#FF0000" : isPending ? "#FFA500" : brandColor;
  let formattedReservationTime = reservationTime;

  return (
    <Html>
      <Head />
      <Preview>
        {isConfirmation
          ? `Uw reservering bij ${restaurantName} is ${status}`
          : `We hebben uw reservering ontvangen bij ${restaurantName}`}
      </Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: brandColor,
                offwhite: "#fafbfb",
                lightGray: "#E8E8E8",
                darkGray: "#333",
              },
              spacing: {
                0: "0px",
                20: "20px",
                45: "45px",
              },
              fontFamily: {
                body: ["Segoe UI", "Roboto", "sans-serif"],
              },
            },
          },
        }}
      >
        <Body className="bg-offwhite text-base font-body">
          <Container className="bg-white p-20">
            {logoUrl && (
              <div className="text-center">
                <Img
                  src={logoUrl}
                  width="400"
                  height="150"
                  alt={`${restaurantName} Logo`}
                  className="mx-auto my-10"
                />
              </div>
            )}
            <Heading className="text-center my-0 leading-8 font-bold text-brand">
              {isConfirmation
                ? `Uw Reservering bij ${restaurantName}`
                : `We hebben uw reservering ontvangen`}
            </Heading>

            <Section className="mt-20">
              <Row>
                <Text className="text-base leading-6 text-gray-700">
                  Beste {guestName},<br />
                  <br />
                  {isCancelled ? (
                    <>
                      Uw reservering op <strong>{reservationTime}</strong> is helaas{" "}
                      <span style={{ color: statusColor, fontWeight: "bold" }}>
                        {status}
                      </span>. We betreuren het dat u uw reservering heeft geannuleerd.
                      <br />
                      <br />
                      Als u vragen heeft of als u op een ander moment wilt reserveren, aarzel dan niet om contact met ons op te nemen via{" "}
                      <a href={`mailto:${emailAddress}`} className="text-brand">
                        {emailAddress}
                      </a>.
                    </>
                  ) : isPending ? (
                    <>
                      Hartelijk dank voor uw reservering bij{" "}
                      <strong>{restaurantName}</strong>. We zijn verheugd om u binnenkort te
                      mogen verwelkomen.
                      <br />
                      <br />
                      Uw reservering op <strong>{formattedReservationTime}</strong> is momenteel{" "}
                      <span style={{ color: statusColor, fontWeight: "bold" }}>
                        in afwachting op goedkeuring
                      </span>. U ontvangt een e-mail zodra uw reservering is bevestigd.
                    </>
                  ) : (
                    <>
                      Hartelijk dank voor uw reservering bij{" "}
                      <strong>{restaurantName}</strong>. We zijn verheugd om u binnenkort te
                      mogen verwelkomen.
                      <br />
                      <br />
                      Uw reservering op <strong>{formattedReservationTime}</strong> is nu{" "}
                      <span style={{ color: statusColor, fontWeight: "bold" }}>
                        {status}
                      </span>.
                    </>
                  )}
                  <br />
                  <br />
                  Met vriendelijke groet,<br />
                  Het {restaurantName} Team
                </Text>
              </Row>
            </Section>
          </Container>

          <Container className="mt-20">
            <Section>
              <Text className="text-center text-gray-400 mb-20 leading-6">
                Heeft u vragen over deze reservering? Neem gerust contact met ons op via{" "}
                <a href={`mailto:${emailAddress}`} className="text-brand">
                  {emailAddress}
                </a>.
                <br />
                N.B. Deze e-mail is automatisch verzonden. Reacties op deze mail kunnen
                wij helaas niet beantwoorden.
              </Text>
            </Section>
          </Container>

          <Container className="mt-20">
            <Text className="text-center text-gray-400 mb-20 leading-6">
              © {new Date().getFullYear()} {restaurantName}. Alle rechten voorbehouden.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReservationEmail;
