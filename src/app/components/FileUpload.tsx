import { useState, useRef, useEffect } from "react";
import { Upload, X, FileVideo, FileText, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  value: string | File | File[] | null;
  onChange: (value: File | File[] | null) => void;
  label: string;
  placeholder?: string;
  accept?: string;
  maxSizeMB?: number;
  isVideo?: boolean;
  multiple?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function FileUpload({
  value,
  onChange,
  label,
  placeholder = "Fayl yuklash uchun bosing yoki torting",
  accept = "image/*",
  maxSizeMB = 50,
  isVideo = false,
  multiple = false,
  isUploading: externalIsUploading,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = externalIsUploading || false;

  useEffect(() => {
    const loadPreviews = async () => {
      if (!value) {
        setPreviews([]);
        return;
      }

      if (typeof value === "string") {
        if (value.toLowerCase().includes(".pdf")) {
          const fileName = value.split("/").pop() || "Jadval fayli.pdf";
          setPreviews([`pdf:${fileName}`]);
        } else {
          setPreviews([value]);
        }
        return;
      }

      if (value instanceof File) {
        if (isVideo && value.type.startsWith("video/")) {
          setPreviews([]);
        } else if (
          value.type === "application/pdf" ||
          value.name.toLowerCase().endsWith(".pdf")
        ) {
          setPreviews([`pdf:${value.name}`]);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews([reader.result as string]);
          };
          reader.readAsDataURL(value);
        }
        return;
      }

      if (Array.isArray(value)) {
        const previewPromises = value.map((item) => {
          if (typeof item === "string") {
            return Promise.resolve(item);
          }
          if (item instanceof File) {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(item);
            });
          }
          return Promise.resolve("");
        });

        const results = await Promise.all(previewPromises);
        setPreviews(results.filter((p) => p !== ""));
      }
    };

    loadPreviews();
  }, [value, isVideo]);

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    const validFiles: File[] = [];
    const acceptsPdf = accept.includes(".pdf") || accept.includes("application/pdf");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxBytes) {
        setUploadError(`Fayl hajmi ${maxSizeMB}MB dan katta. Fayl: ${file.name}`);
        return;
      }
      validFiles.push(file);
    }

    setUploadError("");

    if (isVideo) {
      onChange(multiple ? validFiles : validFiles[0]);
      return;
    }

    const isValidDocument = (file: File) => {
      if (file.type.startsWith("image/")) return true;
      if (acceptsPdf && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        return true;
      }
      return false;
    };

    if (validFiles.every(isValidDocument)) {
      onChange(multiple ? validFiles : validFiles[0]);
      return;
    }

    setUploadError(
      acceptsPdf
        ? "Iltimos, PDF yoki rasm faylini tanlang"
        : "Iltimos, faqat rasm fayllarini tanlang",
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  const handleRemove = (index: number) => {
    if (Array.isArray(value)) {
      const newValue = [...value];
      newValue.splice(index, 1);
      onChange(newValue.length > 0 ? newValue : null);
    } else {
      setPreviews([]);
      setUploadError("");
      onChange(null);
    }
    
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const renderUploadArea = () => (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? "border-[#0d89b1] bg-[#0d89b1]/5 dark:bg-[#0d89b1]/10"
          : "border-gray-200 dark:border-gray-700 hover:border-[#0d89b1] dark:hover:border-[#0d89b1] bg-[#f8fafc] dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
      } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => handleFileChange(e.target.files)}
        className="hidden"
        accept={accept}
        multiple={multiple}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`p-3 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 ${isVideo ? "bg-purple-50 dark:bg-purple-900/20" : "bg-white dark:bg-[#1f2937]"}`}>
          {isVideo ? (
            <FileVideo className="w-6 h-6 text-purple-500" />
          ) : (
            <Upload className="w-6 h-6 text-[#0d89b1]" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[#1f2937] dark:text-gray-200">
            {placeholder}
          </p>
          <p className="text-xs text-[#64748b] dark:text-gray-400 mt-1">
            {isVideo ? "MP4, MOV, AVI (Maks. " : "PNG, JPG, WEBP (Maks. "}{maxSizeMB}MB)
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#1f2937] dark:text-gray-200">{label}</label>

      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
        </div>
      )}

      {isUploading && previews.length === 0 && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 text-[#0d89b1] animate-spin" />
        </div>
      )}

      {previews.length > 0 ? (
        <div className={multiple ? "grid grid-cols-2 gap-2" : "relative"}>
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              {preview.startsWith("pdf:") ? (
                <div className="flex items-center gap-3 w-full h-32 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <FileText className="w-8 h-8 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {preview.replace("pdf:", "")}
                    </p>
                    <p className="text-xs text-gray-500">PDF fayl</p>
                  </div>
                </div>
              ) : isVideo ? (
                <video
                  src={preview}
                  controls
                  className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                />
              ) : (
                <img
                  src={preview}
                  alt={`Preview ${index}`}
                  className="w-full h-32 object-contain bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors"
                />
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isUploading && renderUploadArea()
      )}
    </div>
  );
}

export function ImageUpload(props: Omit<FileUploadProps, "isVideo" | "accept">) {
  return <FileUpload {...props} accept="image/*" isVideo={false} />;
}

export function VideoUpload(props: Omit<FileUploadProps, "isVideo" | "accept">) {
  return <FileUpload {...props} accept="video/*" isVideo={true} />;
}

export function DocumentUpload(
  props: Omit<FileUploadProps, "isVideo" | "accept" | "multiple">,
) {
  return (
    <FileUpload
      {...props}
      accept=".pdf,image/*,application/pdf"
      isVideo={false}
      multiple={false}
      placeholder={props.placeholder || "PDF yoki rasm yuklash uchun bosing"}
      maxSizeMB={props.maxSizeMB ?? 50}
    />
  );
}
