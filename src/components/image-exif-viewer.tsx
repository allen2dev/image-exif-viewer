"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import piexif from 'piexifjs';
// import heic2any from 'heic2any';

const ImageExifViewer = () => {
  const [imageInfo, setImageInfo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatExifDate = (dateStr) => {
    if (!dateStr) return '未知';
    const [date, time] = dateStr.split(' ');
    const [year, month, day] = date.split(':');
    return `${year}年${month}月${day}日 ${time || ''}`;
  };

  const convertDMSToDD = (degrees, minutes, seconds, direction) => {
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
      dd = dd * -1;
    }
    return dd;
  };

  const formatGPSCoordinate = (gpsData, ref) => {
    if (!gpsData || !ref) return null;
    return convertDMSToDD(
      gpsData[0][0] / gpsData[0][1],
      gpsData[1][0] / gpsData[1][1],
      gpsData[2][0] / gpsData[2][1],
      ref
    );
  };

  const readJpegExif = (imageData) => {
    try {
      const exifObj = piexif.load(imageData);
      const exif = exifObj["Exif"];
      const gps = exifObj["GPS"];
      const zeroth = exifObj["0th"];

      return {
        make: zeroth[piexif.ImageIFD.Make]?.trim(),
        model: zeroth[piexif.ImageIFD.Model]?.trim(),
        dateTime: zeroth[piexif.ImageIFD.DateTime],
        exposureTime: exif[piexif.ExifIFD.ExposureTime],
        fNumber: exif[piexif.ExifIFD.FNumber],
        iso: exif[piexif.ExifIFD.ISOSpeedRatings],
        focalLength: exif[piexif.ExifIFD.FocalLength],
        latitude: gps[piexif.GPSIFD.GPSLatitude] ?
          formatGPSCoordinate(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef]) : null,
        longitude: gps[piexif.GPSIFD.GPSLongitude] ?
          formatGPSCoordinate(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef]) : null
      };
    } catch (error) {
      console.error('Failed to read JPEG EXIF:', error);
      throw new Error('无法读取图片的 EXIF 信息');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      let processedFile = file;
      let previewUrl;

      // 如果是 HEIC 文件，先转换为 JPEG
      // if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      //   const convertedBlob = await heic2any({
      //     blob: file,
      //     toType: 'image/jpeg',
      //     quality: 0.8
      //   });
      //   processedFile = new File([convertedBlob], 'converted.jpg', { type: 'image/jpeg' });
      // }

      // 读取文件内容
      const reader = new FileReader();

      const exifData = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          try {
            previewUrl = e.target.result;
            const exif = readJpegExif(e.target.result);
            resolve(exif);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
      });

      setImagePreview(previewUrl);
      setImageInfo(exifData);
    } catch (error) {
      console.error('Failed to process image:', error);
      setError(error.message || '处理图片时出错');
      setImageInfo(null);
      setImagePreview(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>图片EXIF信息查看器</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 上传区域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*, .heic"
              onChange={handleImageUpload}
              className="hidden"
              id="imageInput"
            />
            <label htmlFor="imageInput" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                点击或拖拽图片到这里
                <br />
                <span className="text-xs text-gray-500">支持 JPEG 和 HEIC 格式</span>
              </p>
            </label>
          </div>

          {loading && (
            <div className="text-center text-gray-500">
              正在处理图片...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500">
              {error}
            </div>
          )}

          {/* 图片预览 */}
          {imagePreview && !loading && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="预览"
                style={{ width: '200px' }}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}

          {/* EXIF信息显示 */}
          {imageInfo && !loading && (
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold mb-2">EXIF信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>拍摄时间：{formatExifDate(imageInfo.dateTime)}</div>
                <div>相机品牌：{imageInfo.make || '未知'}</div>
                <div>相机型号：{imageInfo.model || '未知'}</div>
                <div>ISO：{imageInfo.iso || '未知'}</div>
                <div>光圈：{imageInfo.fNumber ?
                  `f/${(imageInfo.fNumber[0] / imageInfo.fNumber[1]).toFixed(1)}` : '未知'}</div>
                <div>焦距：{imageInfo.focalLength ?
                  `${(imageInfo.focalLength[0] / imageInfo.focalLength[1]).toFixed(1)}mm` : '未知'}</div>
                <div>快门速度：{imageInfo.exposureTime ?
                  `1/${(imageInfo.exposureTime[1] / imageInfo.exposureTime[0]).toFixed(0)}` : '未知'}</div>
                {(imageInfo.latitude && imageInfo.longitude) && (
                  <div className="col-span-2">
                    位置：{`${imageInfo.latitude.toFixed(6)}°, ${imageInfo.longitude.toFixed(6)}°`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <footer className='mt-4' style={{textAlign: 'center'}}>
          Created by&nbsp;
          <a
            href="https://allen2dev.github.io"
            rel="author"
            aria-label="AllenYao"
            color='#4285F4'
            target="_blank"
          >
            Allen Yao &nbsp;
          </a>
          &#8226; &nbsp;
          <a
            href="https://github.com/allen2dev"
            rel="author"
            aria-label="Github link"
            color='#4285F4'
            target="_blank"
          >
            <svg
              height="24"
              viewBox="2 2 20 20"
              color="#666"
              aria-hidden="true"
              className='mr-2'
              style={{
                display: 'inline-block',
                verticalAlign: 'top'
              }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 3C7.0275 3 3 7.12937 3 12.2276C3 16.3109 5.57625 19.7597 9.15374 20.9824C9.60374 21.0631 9.77249 20.7863 9.77249 20.5441C9.77249 20.3249 9.76125 19.5982 9.76125 18.8254C7.5 19.2522 6.915 18.2602 6.735 17.7412C6.63375 17.4759 6.19499 16.6569 5.8125 16.4378C5.4975 16.2647 5.0475 15.838 5.80124 15.8264C6.51 15.8149 7.01625 16.4954 7.18499 16.7723C7.99499 18.1679 9.28875 17.7758 9.80625 17.5335C9.885 16.9337 10.1212 16.53 10.38 16.2993C8.3775 16.0687 6.285 15.2728 6.285 11.7432C6.285 10.7397 6.63375 9.9092 7.20749 9.26326C7.1175 9.03257 6.8025 8.08674 7.2975 6.81794C7.2975 6.81794 8.05125 6.57571 9.77249 7.76377C10.4925 7.55615 11.2575 7.45234 12.0225 7.45234C12.7875 7.45234 13.5525 7.55615 14.2725 7.76377C15.9937 6.56418 16.7475 6.81794 16.7475 6.81794C17.2424 8.08674 16.9275 9.03257 16.8375 9.26326C17.4113 9.9092 17.76 10.7281 17.76 11.7432C17.76 15.2843 15.6563 16.0687 13.6537 16.2993C13.98 16.5877 14.2613 17.1414 14.2613 18.0065C14.2613 19.2407 14.25 20.2326 14.25 20.5441C14.25 20.7863 14.4188 21.0746 14.8688 20.9824C16.6554 20.364 18.2079 19.1866 19.3078 17.6162C20.4077 16.0457 20.9995 14.1611 21 12.2276C21 7.12937 16.9725 3 12 3Z"
                fill="currentColor"
              />
            </svg>
            Github
          </a>{' '}
        </footer>
      </CardContent>
    </Card>
  );
};

export default ImageExifViewer;