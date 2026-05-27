import { useState } from "react";
import { useDropzone } from "react-dropzone";
import API from "../services/api";

const UploadBox = () => {
  const [uploadedFiles, setUploadedFiles] =
    useState([]);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];

    const formData = new FormData();

    formData.append("file", file);

    try {
      const res = await API.post(
        "/upload",
        formData
      );

      setUploadedFiles((prev) => [
        ...prev,
        file.name,
      ]);

      alert(res.data.message);
    } catch (error) {
      console.log(error);
    }
  };

  const { getRootProps, getInputProps } =
    useDropzone({
      onDrop,
      accept: {
        "application/pdf": [".pdf"],
      },
    });

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl">

      <h2 className="text-2xl font-bold mb-4">
        Upload Documents
      </h2>

      <div
        {...getRootProps()}
        className="border-2 border-dashed border-zinc-700 p-10 rounded-xl text-center cursor-pointer hover:border-blue-500 transition"
      >
        <input {...getInputProps()} />

        <p className="text-zinc-400">
          Drag & Drop PDF here
        </p>
      </div>

      <div className="mt-6">
        <h3 className="font-bold mb-2">
          Uploaded Files
        </h3>

        {uploadedFiles.map((file, index) => (
          <div
            key={index}
            className="bg-zinc-800 p-3 rounded-lg mb-2"
          >
            {file}
          </div>
        ))}
      </div>

    </div>
  );
};

export default UploadBox;