import React from "react";
import { useDropzone } from "react-dropzone";
import { Button, Box, Typography } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";

const FileUpload = ({ onUpload }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: "application/pdf",
    multiple: false,
    onDrop: (files) => onUpload(files[0]),
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: "2px dashed #ccc",
        borderRadius: "8px",
        p: 4,
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: isDragActive ? "#f5f5f5" : "white",
      }}
    >
      <input {...getInputProps()} />
      <UploadIcon fontSize="large" sx={{ color: "#666", mb: 1 }} />
      <Typography>
        {isDragActive
          ? "Drop the PDF here"
          : "Drag & drop paper PDF, or click to select"}
      </Typography>
      <Button variant="contained" sx={{ mt: 2 }}>
        Browse Files
      </Button>
    </Box>
  );
};

export default FileUpload;
