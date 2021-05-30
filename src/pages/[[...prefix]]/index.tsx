import { GetServerSideProps, NextPage } from "next";
import { Credentials, S3 } from "aws-sdk";
import Link from "next/link";
import styled from "styled-components";

const Container = styled.div`
  margin: 0 auto;
  max-width: 1024px;
  padding: 0 8px;
`;

const NameTd = styled.td`
  overflow: hidden;
  text-overflow: ellipsis;
  width: 200px;
  max-width: 200px;
  text-align: left;
`;

interface Props {
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

const Index: NextPage<Props> = ({
  region,
  bucket,
  prefix,
  prefixes,
  contents,
}) => (
  <Container>
    <h1>{prefix === "" ? "Root" : <>Prefix: {prefix}</>}</h1>
    <hr />
    <table cellSpacing="5">
      <thead>
        <tr>
          <NameTd>Name</NameTd>
          <th align="left">Last modified</th>
          <th align="right">Size</th>
        </tr>
      </thead>
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
        <tr key={`prefix-${e}`}>
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
            <a href={`https://s3-${region}.amazonaws.com/${bucket}/${e.Key}`}>
              {e.label}
            </a>
          </NameTd>
          <td>{new Date(e.LastModified).toLocaleString()}</td>
          <td align="right">{e.Size.toLocaleString()}</td>
        </tr>
      ))}
    </table>
  </Container>
);

export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const region = process.env.S3_REGION!;
  const Bucket = process.env.S3_BUCKET!;
  const s3 = new S3({
    region,
    credentials: new Credentials({
      accessKeyId: process.env.ACCESS_KEY!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    }),
  });

  const rawPrefix = (context.query.prefix as string[]) ?? [];
  const joinedPrefix = rawPrefix.join("/");
  const prefix = joinedPrefix.length < 2 ? "" : joinedPrefix + "/";

  const { CommonPrefixes, Contents } = await s3
    .listObjectsV2({
      Bucket,
      MaxKeys: 1_000,
      Delimiter: "/",
      Prefix: prefix,
    })
    .promise();

  if (
    (CommonPrefixes == null || CommonPrefixes.length === 0) &&
    (Contents == null || Contents.length === 0)
  ) {
    return { notFound: true };
  }

  return {
    props: {
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
    },
  };
};

export default Index;
