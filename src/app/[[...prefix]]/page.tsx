import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HTMLProps, memo, use, useMemo } from "react";
import { SERVER_ENV } from "../../server-env";

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const parentTitle = (await parent).title?.absolute ?? "";

  return {
    title: `${parentTitle} - ${
      Array.isArray(params.prefix) ? `/${params.prefix?.join("/")}` : "Root"
    }`,
  };
}
// Cache for 10 minutes.
export const revalidate = 600;

const NameTd = memo(function NameTd(props: HTMLProps<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className="overflow-hidden overflow-ellipsis w-full text-left"
    />
  );
});

interface Props {
  params: { prefix: undefined | string[] };
}
export default function Index({ params }: Readonly<Props>) {
  const data = use(getBucketContent(params.prefix?.join("/") ?? "/"));
  if (!data) {
    notFound();
  }
  const { region, bucket, prefix, prefixes, contents } = data;

  return (
    <main className="mx-auto max-w-5xl px-2">
      <h1>{prefix === "" ? "Root" : <>Prefix: {prefix}</>}</h1>
      <hr />
      <table cellSpacing="5">
        <thead>
          <tr>
            <NameTd>Name</NameTd>
            <th className="whitespace-nowrap" align="left">
              Last modified
            </th>
            <th align="right">Size</th>
          </tr>
        </thead>
        <tbody>
          {prefix !== "" && (
            <tr>
              <NameTd>
                <Link href="/..">..</Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          )}
          {prefixes.map((e) => (
            <tr key={`prefix-${e.prefix}`}>
              <NameTd>
                <Link href={`/${e.prefix}`}>{e.label}</Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          ))}
          {contents.map((e) => (
            <tr key={`content-${e.Key}`}>
              <NameTd>
                <a
                  href={`https://s3-${region}.amazonaws.com/${bucket}/${e.Key}`}
                >
                  {e.label}
                </a>
              </NameTd>
              <td className="whitespace-nowrap">
                {new Date(e.LastModified).toLocaleString()}
              </td>
              <td className="whitespace-nowrap" align="right">
                {e.Size.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

interface BucketContentResponse {
  region: string;
  bucket: string;
  prefix: string;
  prefixes: Array<{
    prefix: string;
    label: string;
  }>;
  contents: Array<{
    Key: string;
    label: string;
    LastModified: string;
    Size: number;
  }>;
}
const getBucketContent = async (
  pathname: string
): Promise<BucketContentResponse | undefined> => {
  const region = SERVER_ENV.S3_REGION;
  const Bucket = SERVER_ENV.S3_BUCKET;
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: SERVER_ENV.ACCESS_KEY,
      secretAccessKey: SERVER_ENV.SECRET_ACCESS_KEY,
    },
  });

  const prefix = pathname.length < 2 ? "" : pathname + "/";

  const { CommonPrefixes, Contents } = await s3.send(
    new ListObjectsV2Command({
      Bucket,
      MaxKeys: 1_000,
      Delimiter: "/",
      Prefix: prefix,
    })
  );

  if (
    (CommonPrefixes == null || CommonPrefixes.length === 0) &&
    (Contents == null || Contents.length === 0)
  ) {
    return undefined;
  }

  return {
    region,
    bucket: Bucket,
    prefix,
    prefixes:
      CommonPrefixes?.map((e) => ({
        label: e.Prefix?.slice(prefix.length) ?? "",
        prefix: e.Prefix!,
      })) ?? [],
    contents:
      Contents?.filter((e) => e.Key != null).map((e) => ({
        ...e,
        Key: e.Key!,
        LastModified: e.LastModified!.toISOString(),
        Size: e.Size ?? 0,
        label: e.Key?.slice(prefix.length) ?? "",
      })) ?? [],
  };
};
