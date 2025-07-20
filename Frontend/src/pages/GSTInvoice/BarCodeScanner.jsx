import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Box, Typography } from "@mui/material";

const BarcodeScannerCamera = ({ onScanned }) => {
  const scannerRef = useRef();

  useEffect(() => {
    const config = { fps: 10, qrbox: 250 };
    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length) {
        html5QrCode
          .start(
            { facingMode: "environment" }, // rear camera
            config,
            (decodedText, decodedResult) => {
              onScanned(decodedText);
              html5QrCode.stop(); // Stop after one scan
            },
            (errorMessage) => {
              // console.warn("Scan error:", errorMessage);
            }
          )
          .catch((err) => {
            console.error("Camera start error:", err);
          });
      }
    });

    return () => {
      html5QrCode.stop().then(() => {
        html5QrCode.clear();
      });
    };
  }, [onScanned]);

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Scan Barcode
      </Typography>
      <div
        id="reader"
        ref={scannerRef}
        style={{ width: "100%", maxWidth: "400px", margin: "auto" }}
      />
    </Box>
  );
};

export default BarcodeScannerCamera;
